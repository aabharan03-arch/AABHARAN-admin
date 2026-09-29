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
  Plus,
  IndianRupee,
  TrendingUp,
  Receipt,
  X,
  Pencil,
  FileSpreadsheet,
  FileText,
  Banknote,
  CreditCard,
  Smartphone,
  FileCheck,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type PaymentSplitInput = {
  method: PaymentMethod;
  amount: string;
  txnRef: string;
};

type PaymentSplitView = {
  id?: string;
  method: PaymentMethod;
  amount: number;
  txnRef?: string | null;
};

export const Route = createFileRoute("/_admin/payments")({
  head: () => ({ meta: [{ title: "Payments · Aabharan Admin" }] }),
  component: PaymentsPage,
});

const CACHE_KEY = "aabharan_payments_cache";
const CACHE_TTL = 5 * 60 * 1000;

const METHODS: PaymentMethod[] = ["UPI", "CASH", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"];
const STATUSES: PaymentStatus[] = ["PAID", "PENDING", "FAILED", "REFUNDED"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-");
}

function formatPdfAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLabel(s: string) {
  return s.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Every payment is treated as a list of splits. Old payments without a
// paymentBreakdown fall back to a single split (method + net amount).
function getPaymentSplits(p: Payment): PaymentSplitView[] {
  const breakdown = (p as any).paymentBreakdown as PaymentSplitView[] | undefined;
  if (breakdown?.length) {
    return breakdown.map((s) => ({ ...s, amount: Number(s.amount) || 0 }));
  }
  return [{ method: p.method, amount: p.amount - p.discount, txnRef: p.txnRef }];
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
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(now.getMonth());
  const [yearFilter, setYearFilter] = useState(now.getFullYear());

  // Record payment modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [recordForm, setRecordForm] = useState({
    storeAdminId: "",
    planId: "",
    amount: "",
    discount: "",
    collectedBy: "Admin",
    notes: "",
  });
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplitInput[]>([
    { method: "UPI", amount: "", txnRef: "" },
  ]);
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
    } catch {
      return null;
    }
  }, []);

  const writeCache = useCallback((data: Payment[], summary: PaymentSummary) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, summary, ts: Date.now() }));
    } catch {
      /* ignore */
    }
  }, []);

  const fetchPayments = useCallback(
    async (force = false) => {
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
    },
    [readCache, writeCache]
  );

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // ---- Month / year + status filtering ----
  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    payments.forEach((payment) => {
      const date = new Date(payment.paidAt);
      if (!Number.isNaN(date.getTime())) years.add(date.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [payments]);

  const monthYearFiltered = useMemo(() => {
    return payments.filter((payment) => {
      const date = new Date(payment.paidAt);
      return (
        !Number.isNaN(date.getTime()) &&
        date.getMonth() === monthFilter &&
        date.getFullYear() === yearFilter
      );
    });
  }, [payments, monthFilter, yearFilter]);

  const filtered = useMemo(() => {
    if (statusFilter === "All") return monthYearFiltered;
    return monthYearFiltered.filter((p) => p.status === statusFilter);
  }, [monthYearFiltered, statusFilter]);

  const filteredNetTotal = useMemo(
    () => filtered.reduce((sum, p) => sum + (p.amount - p.discount), 0),
    [filtered]
  );

  // Method-wise collected amounts (PAID only) — follows month / year / status filters
  const methodTotals = useMemo(() => {
    const totals = Object.fromEntries(METHODS.map((m) => [m, 0])) as Record<PaymentMethod, number>;
    filtered
      .filter((p) => p.status === "PAID")
      .forEach((p) => {
        getPaymentSplits(p).forEach((s) => {
          totals[s.method] = (totals[s.method] || 0) + s.amount;
        });
      });
    return totals;
  }, [filtered]);

  const methodGrandTotal = useMemo(
    () => METHODS.reduce((sum, m) => sum + methodTotals[m], 0),
    [methodTotals]
  );

  const methodCards = useMemo(
    () => [
      { label: "Cash collected", value: inrFull(methodTotals.CASH), icon: Banknote },
      { label: "Card collected", value: inrFull(methodTotals.CARD), icon: CreditCard },
      { label: "Cheque collected", value: inrFull(methodTotals.CHEQUE), icon: FileCheck },
      { label: "UPI collected", value: inrFull(methodTotals.UPI), icon: Smartphone },
    ],
    [methodTotals]
  );

  const reportTitle = `${MONTHS[monthFilter]} ${yearFilter}${
    statusFilter === "All" ? "" : ` - ${formatLabel(statusFilter)}`
  }`;

  const exportExcel = () => {
    if (filtered.length === 0) {
      toast.error("No payments available for the selected filters");
      return;
    }

    const splitAmt = (p: Payment, m: PaymentMethod) =>
      getPaymentSplits(p)
        .filter((s) => s.method === m)
        .reduce((a, s) => a + s.amount, 0);

    const rows = filtered.map((p, index) => ({
      "S.No": index + 1,
      "Payment ID": p.id,
      "Invoice No": p.invoiceNo,
      "Sponsor": p.sponsorName,
      "Plan": p.planName,
      "Payment Method": getPaymentSplits(p)
        .map((s) => formatLabel(s.method))
        .join(" + "),
      "Transaction Ref": getPaymentSplits(p)
        .map((s) => s.txnRef)
        .filter(Boolean)
        .join(", "),
      "Paid At": new Date(p.paidAt).toLocaleString("en-IN"),
      "Collected By": p.collectedBy,
      "Status": formatLabel(p.status),
      "Amount": p.amount,
      "Discount": p.discount,
      "Net Amount": p.amount - p.discount,
      ...Object.fromEntries(METHODS.map((m) => [`${formatLabel(m)} Amt`, splitAmt(p, m)])),
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 7 },
      { wch: 38 },
      { wch: 22 },
      { wch: 24 },
      { wch: 22 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      ...METHODS.map(() => ({ wch: 14 })),
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ["Aabharan Payment Report"],
      ["Report Period", reportTitle],
      ["Generated", new Date().toLocaleString("en-IN")],
      ["Transactions", filtered.length],
      ["Gross Amount", filtered.reduce((sum, p) => sum + p.amount, 0)],
      ["Discount", filtered.reduce((sum, p) => sum + p.discount, 0)],
      ["Net Amount", filteredNetTotal],
      ["Paid", filtered.filter((p) => p.status === "PAID").length],
      ["Pending", filtered.filter((p) => p.status === "PENDING").length],
      ["Failed", filtered.filter((p) => p.status === "FAILED").length],
      ["Refunded", filtered.filter((p) => p.status === "REFUNDED").length],
      [],
      ["Collected by method (PAID only)"],
      ...METHODS.map((m) => [formatLabel(m), methodTotals[m]]),
      ["Total collected", methodGrandTotal],
    ]);

    summarySheet["!cols"] = [{ wch: 26 }, { wch: 42 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    XLSX.writeFile(workbook, `payments-${safeFileName(reportTitle)}.xlsx`);

    toast.success("Excel report downloaded");
  };

  const exportPdf = () => {
    if (filtered.length === 0) {
      toast.error("No payments available for the selected filters");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.text("Aabharan Payment Report", 14, 14);

    doc.setFontSize(9);
    doc.text(`Period: ${reportTitle}`, 14, 20);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 25);
    doc.text(
      `Transactions: ${filtered.length}   Net total: ${formatPdfAmount(filteredNetTotal)}`,
      14,
      30
    );

    // Method-wise collection summary (PAID only)
    autoTable(doc, {
      startY: 34,
      head: [["Method", "Collected (PAID)"]],
      body: [
        ...METHODS.map((m) => [formatLabel(m), formatPdfAmount(methodTotals[m])]),
        ["Total", formatPdfAmount(methodGrandTotal)],
      ],
      styles: { font: "helvetica", fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [4, 9, 30], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 40, halign: "right" } },
      margin: { left: 8 },
      tableWidth: 80,
    });

    const detailStartY = ((doc as any).lastAutoTable?.finalY ?? 34) + 6;

    autoTable(doc, {
      startY: detailStartY,
      head: [
        [
          "#",
          "Invoice",
          "Sponsor",
          "Plan",
          "Method (amount)",
          "Txn Ref",
          "Date",
          "Collected By",
          "Status",
          "Amount",
          "Discount",
          "Net",
        ],
      ],
      body: filtered.map((p, index) => {
        const splits = getPaymentSplits(p);
        return [
          String(index + 1),
          p.invoiceNo,
          p.sponsorName,
          p.planName,
          splits.map((s) => `${formatLabel(s.method)}: ${formatPdfAmount(s.amount)}`).join("\n"),
          splits
            .map((s) => s.txnRef)
            .filter(Boolean)
            .join("\n") || "-",
          new Date(p.paidAt).toLocaleString("en-IN"),
          p.collectedBy,
          formatLabel(p.status),
          formatPdfAmount(p.amount),
          formatPdfAmount(p.discount),
          formatPdfAmount(p.amount - p.discount),
        ];
      }),
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "top",
        textColor: [17, 24, 39],
      },
      headStyles: {
        fillColor: [4, 9, 30],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 26 },
        2: { cellWidth: 24 },
        3: { cellWidth: 20 },
        4: { cellWidth: 38 },
        5: { cellWidth: 24 },
        6: { cellWidth: 26 },
        7: { cellWidth: 20 },
        8: { cellWidth: 16 },
        9: { cellWidth: 18 },
        10: { cellWidth: 16 },
        11: { cellWidth: 18 },
      },
      margin: { left: 8, right: 8 },
    });

    doc.save(`payments-${safeFileName(reportTitle)}.pdf`);
    toast.success("PDF report downloaded");
  };

  // ---- Record payment ----
  const openRecordModal = async () => {
    setFormError(null);
    setRecordForm({
      storeAdminId: "",
      planId: "",
      amount: "",
      discount: "",
      collectedBy: "Admin",
      notes: "",
    });
    setPaymentSplits([{ method: "UPI", amount: "", txnRef: "" }]);
    setShowRecordModal(true);

    if (stores.length === 0) {
      const [storesRes, plansRes] = await Promise.all([getStores(), getPlans()]);
      if (storesRes.success) setStores(storesRes.stores);
      if (plansRes.success) setPlans(plansRes.plans);
    }
  };

  const netPayable = Math.max(0, Number(recordForm.amount || 0) - Number(recordForm.discount || 0));

  const splitTotal = paymentSplits.reduce((sum, split) => sum + (Number(split.amount) || 0), 0);

  const splitDifference = Number((netPayable - splitTotal).toFixed(2));

  const updatePaymentSplit = (index: number, patch: Partial<PaymentSplitInput>) => {
    setPaymentSplits((current) =>
      current.map((split, i) => (i === index ? { ...split, ...patch } : split))
    );
  };

  const addPaymentSplit = () => {
    setPaymentSplits((current) => [...current, { method: "UPI", amount: "", txnRef: "" }]);
  };

  const removePaymentSplit = (index: number) => {
    setPaymentSplits((current) => {
      if (current.length === 1) {
        return [{ method: "UPI", amount: "", txnRef: "" }];
      }
      return current.filter((_, i) => i !== index);
    });
  };

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!recordForm.storeAdminId) {
      setFormError("Please select a sponsor.");
      return;
    }

    if (!recordForm.amount || Number(recordForm.amount) <= 0) {
      setFormError("Enter a valid bill amount.");
      return;
    }

    if (Number(recordForm.discount || 0) < 0) {
      setFormError("Discount cannot be negative.");
      return;
    }

    if (netPayable <= 0) {
      setFormError("Net payable amount must be greater than zero.");
      return;
    }

    const normalizedSplits = paymentSplits
      .map((split) => ({
        method: split.method,
        amount: Number(split.amount),
        txnRef: split.txnRef.trim() || undefined,
      }))
      .filter((split) => split.amount > 0);

    if (normalizedSplits.length === 0) {
      setFormError("Add at least one payment method and amount.");
      return;
    }

    const totalFromSplits = normalizedSplits.reduce((sum, split) => sum + split.amount, 0);

    if (Math.abs(totalFromSplits - netPayable) > 0.01) {
      setFormError(
        `Payment split total must exactly match the net payable amount (${inrFull(netPayable)}).`
      );
      return;
    }

    setSaving(true);

    try {
      const result = await createPayment({
        storeAdminId: recordForm.storeAdminId,
        planId: recordForm.planId || undefined,
        amount: Number(recordForm.amount),
        discount: Number(recordForm.discount) || 0,
        collectedBy: recordForm.collectedBy || "Admin",
        notes: recordForm.notes || undefined,
        paymentBreakdown: normalizedSplits,
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

  const summaryCards = useMemo(
    () => [
      { label: "Today", value: inr(summary.today), icon: IndianRupee, highlight: false },
      { label: "This week", value: inr(summary.week), icon: TrendingUp, highlight: false },
      { label: "This month", value: inr(summary.month), icon: Receipt, highlight: false },
      { label: "Lifetime", value: inr(summary.lifetime), icon: IndianRupee, highlight: true },
    ],
    [summary]
  );

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="h-3.5 w-20 rounded bg-muted animate-pulse" />
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
            <button
              onClick={() => fetchPayments(true)}
              className="mt-4 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95"
            >
              Retry
            </button>
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

        {/* Method-wise collection (follows month / year / status filters) */}
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Collected by method · {reportTitle}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {methodCards.map((c) => (
              <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} />
            ))}
          </div>
        </div>

        {/* Filters & report actions */}
        <Card className="p-4">
          <div className="flex flex-col xl:flex-row xl:items-end gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Month
                </label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Year
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "All" | PaymentStatus)}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="All">All Statuses</option>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => fetchPayments(true)}
                title="Refresh"
                className="h-10 px-3 rounded-md border border-border bg-card hover:bg-muted text-xs"
              >
                ⟳ Refresh
              </button>

              <button
                onClick={exportExcel}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </button>

              <button
                onClick={exportPdf}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium"
              >
                <FileText className="h-4 w-4" />
                PDF
              </button>

              <button
                onClick={openRecordModal}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-95"
              >
                <Plus className="h-4 w-4" />
                Record payment
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span>{filtered.length} transactions</span>
            <span>Report: {reportTitle}</span>
            <span>Net total: {inrFull(filteredNetTotal)}</span>
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
                      <div className="text-xs text-muted-foreground">
                        {getPaymentSplits(p)
                          .map((s) => s.txnRef)
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-foreground">{p.sponsorName}</td>

                    <td className="px-5 py-3.5 text-muted-foreground">{p.planName}</td>

                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {getPaymentSplits(p).map((split, index) => (
                          <span
                            key={`${split.method}-${index}`}
                            className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] text-foreground"
                            title={split.txnRef || undefined}
                          >
                            {formatLabel(split.method)} · {inrFull(split.amount)}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground tabular-nums">
                      {new Date(p.paidAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground">{p.collectedBy}</td>

                    <td className="px-5 py-3.5">
                      <StatusPill status={p.status.toLowerCase()} />
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="font-medium text-foreground tabular-nums">
                        {inrFull(p.amount - p.discount)}
                      </div>
                      {p.discount > 0 && (
                        <div className="text-[11px] text-muted-foreground">−{inrFull(p.discount)} disc.</div>
                      )}
                    </td>

                    <td className="px-3 py-3.5 text-right">
                      <button
                        onClick={() => openEditModal(p)}
                        className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground"
                        title="Edit payment"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">
                      No payments found for the selected month, year, and status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Record Payment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !saving && setShowRecordModal(false)}
          />

          <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Record payment</h2>
              <button
                onClick={() => !saving && setShowRecordModal(false)}
                className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground"
              >
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
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Sponsor <span className="text-red-500">*</span>
                </label>
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
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.months} mo · {inrFull(p.cost)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Selecting a plan auto-fills the amount and creates/extends an active subscription.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Amount <span className="text-red-500">*</span>
                  </label>
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

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Payment breakdown <span className="text-red-500">*</span>
                    </label>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Split one bill across cash, card, UPI, cheque, bank transfer, or other methods.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addPaymentSplit}
                    disabled={saving}
                    className="h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-muted disabled:opacity-60"
                  >
                    + Add method
                  </button>
                </div>

                <div className="space-y-2">
                  {paymentSplits.map((split, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-[150px_1fr_1fr_auto] gap-2 rounded-lg border border-border bg-muted/20 p-3"
                    >
                      <select
                        value={split.method}
                        onChange={(e) =>
                          updatePaymentSplit(index, {
                            method: e.target.value as PaymentMethod,
                          })
                        }
                        disabled={saving}
                        className="h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                      >
                        {METHODS.map((method) => (
                          <option key={method} value={method}>
                            {formatLabel(method)}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={split.amount}
                        onChange={(e) => updatePaymentSplit(index, { amount: e.target.value })}
                        placeholder="Amount"
                        disabled={saving}
                        className="h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                      />

                      <input
                        type="text"
                        value={split.txnRef}
                        onChange={(e) => updatePaymentSplit(index, { txnRef: e.target.value })}
                        placeholder={
                          split.method === "CASH"
                            ? "Reference (optional)"
                            : split.method === "CHEQUE"
                            ? "Cheque no."
                            : "Txn ref / UTR"
                        }
                        disabled={saving}
                        className="h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                      />

                      <button
                        type="button"
                        onClick={() => removePaymentSplit(index)}
                        disabled={saving}
                        className="h-10 w-10 rounded-md border border-border text-muted-foreground hover:text-red-500 hover:bg-red-500/5 disabled:opacity-60"
                        title="Remove payment method"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Net payable</div>
                    <div className="mt-1 font-semibold tabular-nums">{inrFull(netPayable)}</div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Split total</div>
                    <div className="mt-1 font-semibold tabular-nums">{inrFull(splitTotal)}</div>
                  </div>

                  <div
                    className={`rounded-lg border p-3 ${
                      Math.abs(splitDifference) <= 0.01
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-amber-500/30 bg-amber-500/5"
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {splitDifference > 0 ? "Remaining" : splitDifference < 0 ? "Excess" : "Balanced"}
                    </div>
                    <div className="mt-1 font-semibold tabular-nums">{inrFull(Math.abs(splitDifference))}</div>
                  </div>
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

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
                  <textarea
                    value={recordForm.notes}
                    onChange={(e) => setRecordForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes"
                    disabled={saving}
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none"
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
                  {saving && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  )}
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
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !editing && setEditTarget(null)}
          />

          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold">Edit payment</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editTarget.invoiceNo} · {editTarget.sponsorName}
                </p>
              </div>
              <button
                onClick={() => !editing && setEditTarget(null)}
                className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground"
              >
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
                  {editing && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  )}
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

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-5 ${highlight ? "navy-gradient text-ivory border-0" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <div
            className={`text-[11px] uppercase tracking-[0.14em] ${
              highlight ? "text-ivory/60" : "text-muted-foreground"
            }`}
          >
            {label}
          </div>
          <div className={`mt-2 font-display text-3xl ${highlight ? "text-gold-gradient" : "text-foreground"}`}>
            {value}
          </div>
        </div>
        <div
          className={`h-10 w-10 rounded-lg grid place-items-center ${
            highlight ? "bg-ivory/10 text-gold" : "bg-primary/5 text-primary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}