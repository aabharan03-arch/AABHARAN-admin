import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card, StatusPill } from "@/components/admin/ui-bits";
import { inr, inrFull } from "@/lib/mock-data";
import {
  getPayments,
  getStores,
  getPlans,
  createPayment,
  updatePayment,
  type Payment,
  type PaymentSummary,
  type PaymentStatus,
  type PaymentMethod,
  type Store,
  type Plan,
} from "@/lib/api";
import {
  Download, Plus, IndianRupee, TrendingUp, Receipt, X, Pencil,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/payments")({
  head: () => ({ meta: [{ title: "Payments · Aabharan Admin" }] }),
  component: PaymentsPage,
});

const CACHE_KEY = "aabharan_payments_cache";
const CACHE_TTL = 5 * 60 * 1000;

const METHODS: PaymentMethod[] = ["UPI", "CASH", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"];
const STATUSES: PaymentStatus[] = ["PAID", "PENDING", "FAILED", "REFUNDED"];

function formatLabel(s: string) {
  return s.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Shared helper — recomputes summary-side after record/edit
function computeSummary(payments: Payment[]): PaymentSummary {
  const sum = (list: Payment[]) => list.reduce((a, p) => a + (p.amount - p.discount), 0);
  const paid = payments.filter((p) => p.status === "PAID");
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - ((startOfToday.getDay() + 6) % 7));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    today: sum(paid.filter((p) => new Date(p.paidAt) >= startOfToday)),
    week: sum(paid.filter((p) => new Date(p.paidAt) >= startOfWeek)),
    month: sum(paid.filter((p) => new Date(p.paidAt) >= startOfMonth)),
    lifetime: sum(paid),
  };
}

function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({ today: 0, week: 0, month: 0, lifetime: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | PaymentStatus>("All");

  // Record payment modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [recordForm, setRecordForm] = useState({
    storeAdminId: "", planId: "", method: "UPI" as PaymentMethod,
    amount: "", discount: "", txnRef: "", collectedBy: "Admin",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit payment modal
  const [editTarget, setEditTarget] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", discount: "", status: "PAID" as PaymentStatus });
  const [editing, setEditing] = useState(false);

  // ---- Cache ----
  const readCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { data, summary, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) return null;
      return { data, summary };
    } catch { return null; }
  }, []);

  const writeCache = useCallback((data: Payment[], summary: PaymentSummary) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, summary, ts: Date.now() }));
    } catch { /* ignore */ }
  }, []);

  const fetchPayments = useCallback(async (force = false) => {
    if (!force) {
      const cached = readCache();
      if (cached) {
        setPayments(cached.data);
        setSummary(cached.summary);
        setLoading(false);
        setError(null);
        return;
      }
    }
    try {
      setLoading(true);
      const res = await getPayments();
      if (res.success) {
        setPayments(res.payments);
        setSummary(res.summary);
        writeCache(res.payments, res.summary);
        setError(null);
      } else {
        setError(res.error || "Failed to fetch payments");
        toast.error(res.error || "Failed to fetch payments");
      }
    } finally {
      setLoading(false);
    }
  }, [readCache, writeCache]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ---- Memoized filtered list ----
  const filtered = useMemo(() => {
    if (statusFilter === "All") return payments;
    return payments.filter((p) => p.status === statusFilter);
  }, [payments, statusFilter]);

  // ---- Record payment ----
  const openRecordModal = async () => {
    setFormError(null);
    setRecordForm({ storeAdminId: "", planId: "", method: "UPI", amount: "", discount: "", txnRef: "", collectedBy: "Admin" });
    setShowRecordModal(true);
    if (stores.length === 0) {
      const [storesRes, plansRes] = await Promise.all([getStores(), getPlans()]);
      if (storesRes.success) setStores(storesRes.stores);
      if (plansRes.success) setPlans(plansRes.plans);
    }
  };

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!recordForm.storeAdminId) { setFormError("Please select a sponsor."); return; }
    if (!recordForm.amount || Number(recordForm.amount) <= 0) { setFormError("Enter a valid amount."); return; }

    setSaving(true);
    try {
      const result = await createPayment({
        storeAdminId: recordForm.storeAdminId,
        planId: recordForm.planId || undefined,
        method: recordForm.method,
        amount: Number(recordForm.amount),
        discount: Number(recordForm.discount) || 0,
        txnRef: recordForm.txnRef || undefined,
        collectedBy: recordForm.collectedBy || "Admin",
      });

      if (result.success && result.payment) {
        const next = [result.payment, ...payments];
        const newSummary = computeSummary(next);
        setPayments(next);
        setSummary(newSummary);
        writeCache(next, newSummary);
        toast.success(`Payment ${result.payment.invoiceNo} recorded`);
        setShowRecordModal(false);
      } else {
        setFormError(result.error || "Failed to record payment");
      }
    } finally {
      setSaving(false);
    }
  };

  // ---- Edit payment (amount + status) ----
  const openEditModal = (p: Payment) => {
    setEditTarget(p);
    setEditForm({ amount: String(p.amount), discount: String(p.discount), status: p.status });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditing(true);
    try {
      const result = await updatePayment(editTarget.id, {
        amount: Number(editForm.amount),
        discount: Number(editForm.discount) || 0,
        status: editForm.status,
      });
      if (result.success && result.payment) {
        const updated = result.payment;
        setPayments((current) => {
          const next = current.map((p) => (p.id === updated.id ? updated : p));
          const newSummary = computeSummary(next);
          setSummary(newSummary);
          writeCache(next, newSummary);
          return next;
        });
        toast.success(`${updated.invoiceNo} updated`);
        setEditTarget(null);
      } else {
        toast.error(result.error || "Failed to update payment");
      }
    } finally {
      setEditing(false);
    }
  };

  const summaryCards = useMemo(() => [
    { label: "Today", value: inr(summary.today), icon: IndianRupee, highlight: false },
    { label: "This week", value: inr(summary.week), icon: TrendingUp, highlight: false },
    { label: "This month", value: inr(summary.month), icon: Receipt, highlight: false },
    { label: "Lifetime", value: inr(summary.lifetime), icon: IndianRupee, highlight: true },
  ], [summary]);

  // ---- Skeleton loading ----
  if (loading) {
    return (
      <>
        <AdminTopbar title="Payments" subtitle="Loading…" />
        <div className="px-6 lg:px-10 py-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="h-3.5 w-16 rounded bg-muted animate-pulse" />
                <div className="mt-3 h-8 w-28 rounded bg-muted animate-pulse" />
              </Card>
            ))}
          </div>
          <Card className="overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6 px-5 py-3.5 border-b border-border last:border-0">
                <div className="space-y-1.5 w-32">
                  <div className="h-3.5 rounded bg-muted animate-pulse" />
                  <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3.5 w-16 rounded bg-muted animate-pulse" />
                <div className="h-5 w-14 rounded bg-muted animate-pulse" />
                <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3.5 w-16 rounded bg-muted animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                <div className="h-3.5 w-20 rounded bg-muted animate-pulse ml-auto" />
              </div>
            ))}
          </Card>
        </div>
      </>
    );
  }

  if (error && payments.length === 0) {
    return (
      <>
        <AdminTopbar title="Payments" subtitle="Error loading payments" />
        <div className="px-6 lg:px-10 py-8">
          <Card className="p-6 text-center">
            <p className="text-red-500">{error}</p>
            <button onClick={() => fetchPayments(true)} className="mt-4 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95">Retry</button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminTopbar
        title="Payments"
        subtitle={`${payments.length} transactions · ${inrFull(summary.lifetime)} lifetime`}
      />

      <div className="px-6 lg:px-10 py-8 space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((c) => (
            <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} highlight={c.highlight} />
          ))}
        </div>

        {/* Toolbar */}
        <Card className="p-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 flex-wrap">
            {(["All", ...STATUSES] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`h-8 px-3 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => fetchPayments(true)} title="Refresh" className="h-9 px-3 rounded-md border border-border bg-card hover:bg-muted text-xs">⟳</button>
            <button className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <button onClick={openRecordModal} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-95">
              <Plus className="h-4 w-4" /> Record payment
            </button>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="font-medium px-5 py-3">Invoice</th>
                  <th className="font-medium px-5 py-3">Sponsor</th>
                  <th className="font-medium px-5 py-3">Plan</th>
                  <th className="font-medium px-5 py-3">Method</th>
                  <th className="font-medium px-5 py-3">Date</th>
                  <th className="font-medium px-5 py-3">Collected by</th>
                  <th className="font-medium px-5 py-3">Status</th>
                  <th className="font-medium px-5 py-3 text-right">Amount</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-foreground">{p.invoiceNo}</div>
                      <div className="text-xs text-muted-foreground">{p.txnRef || "—"}</div>
                    </td>
                    <td className="px-5 py-3.5 text-foreground">{p.sponsorName}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{p.planName}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">{formatLabel(p.method)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground tabular-nums">
                      {new Date(p.paidAt).toLocaleDateString("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" })}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{p.collectedBy}</td>
                    <td className="px-5 py-3.5"><StatusPill status={p.status.toLowerCase()} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="font-medium text-foreground tabular-nums">{inrFull(p.amount - p.discount)}</div>
                      {p.discount > 0 && <div className="text-[11px] text-muted-foreground">−{inrFull(p.discount)} disc.</div>}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <button onClick={() => openEditModal(p)} className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground" title="Edit payment">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">No payments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Record Payment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setShowRecordModal(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Record payment</h2>
              <button onClick={() => !saving && setShowRecordModal(false)} className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecord} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && (
                <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-500">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sponsor <span className="text-red-500">*</span></label>
                <select
                  value={recordForm.storeAdminId}
                  onChange={(e) => setRecordForm((f) => ({ ...f, storeAdminId: e.target.value }))}
                  disabled={saving}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">Select a sponsor…</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.storeId || s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Plan</label>
                <select
                  value={recordForm.planId}
                  onChange={(e) => {
                    const planId = e.target.value;
                    const plan = plans.find((p) => p.id === planId);
                    setRecordForm((f) => ({
                      ...f,
                      planId,
                      amount: plan ? String(plan.cost) : f.amount,
                    }));
                  }}
                  disabled={saving}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">No plan (custom payment)</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} · {p.months} mo · {inrFull(p.cost)}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Selecting a plan auto-fills the amount and creates/extends an active subscription.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    value={recordForm.amount}
                    onChange={(e) => setRecordForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="26000"
                    disabled={saving}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Discount</label>
                  <input
                    type="number"
                    min="0"
                    value={recordForm.discount}
                    onChange={(e) => setRecordForm((f) => ({ ...f, discount: e.target.value }))}
                    placeholder="0"
                    disabled={saving}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment method</label>
                <select
                  value={recordForm.method}
                  onChange={(e) => setRecordForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))}
                  disabled={saving}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>{formatLabel(m)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Txn ref (UTR)</label>
                  <input
                    type="text"
                    value={recordForm.txnRef}
                    onChange={(e) => setRecordForm((f) => ({ ...f, txnRef: e.target.value }))}
                    placeholder="TXN800000"
                    disabled={saving}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Collected by</label>
                  <input
                    type="text"
                    value={recordForm.collectedBy}
                    onChange={(e) => setRecordForm((f) => ({ ...f, collectedBy: e.target.value }))}
                    placeholder="Admin"
                    disabled={saving}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  disabled={saving}
                  className="h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />}
                  {saving ? "Recording…" : "Record payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !editing && setEditTarget(null)} />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold">Edit payment</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{editTarget.invoiceNo} · {editTarget.sponsorName}</p>
              </div>
              <button onClick={() => !editing && setEditTarget(null)} className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                  disabled={editing}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Discount</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.discount}
                  onChange={(e) => setEditForm((f) => ({ ...f, discount: e.target.value }))}
                  disabled={editing}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                <div className="flex gap-1.5 flex-wrap">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditForm((f) => ({ ...f, status: s }))}
                      className={`h-8 px-3 rounded-md text-xs font-medium border transition-colors ${
                        editForm.status === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {formatLabel(s)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  disabled={editing}
                  className="h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {editing && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />}
                  {editing ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value, icon: Icon, highlight }: { label: string; value: string; icon: React.ElementType; highlight?: boolean }) {
  return (
    <Card className={`p-5 ${highlight ? "navy-gradient text-ivory border-0" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-[11px] uppercase tracking-[0.14em] ${highlight ? "text-ivory/60" : "text-muted-foreground"}`}>{label}</div>
          <div className={`mt-2 font-display text-3xl ${highlight ? "text-gold-gradient" : "text-foreground"}`}>{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-lg grid place-items-center ${highlight ? "bg-ivory/10 text-gold" : "bg-primary/5 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}