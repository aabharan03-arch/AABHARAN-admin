import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminTopbar } from "@/components/admin/topbar";

import { Card } from "@/components/admin/ui-bits";

import { inrFull } from "@/lib/mock-data";

import {

  changeStoreStatus,

  createStore,

  getStores,

  getPlans,

  assignPlan,

  type Store,

  type Plan,

} from "@/lib/api";

import { Plus, Filter, Download, MoreHorizontal, MapPin, X, Crown } from "lucide-react";

import { useState, useEffect, useMemo, useCallback } from "react";

import { toast } from "sonner";



export const Route = createFileRoute("/_admin/sponsors/")({

  head: () => ({ meta: [{ title: "Sponsors · Aabharan Admin" }] }),

  component: SponsorsPage,

});



const filters = ["All", "Active", "Featured", "Expiring", "Expired", "Pending"] as const;



const CACHE_KEY = "aabharan_sponsors_cache";

const CACHE_TTL = 5 * 60 * 1000;



function SponsorsPage() {

  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const [q, setQ] = useState("");

  const [sponsors, setSponsors] = useState<Store[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);



  // Create store modal

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const [formError, setFormError] = useState<string | null>(null);



  // Assign plan modal

  const [assignTarget, setAssignTarget] = useState<Store | null>(null); // store being assigned

  const [plans, setPlans] = useState<Plan[]>([]);

  const [plansLoading, setPlansLoading] = useState(false);

  const [selectedPlanId, setSelectedPlanId] = useState("");

  const [assigning, setAssigning] = useState(false);



  // ---- Cache helpers ----

  const readCache = useCallback((): Store[] | null => {

    try {

      const raw = localStorage.getItem(CACHE_KEY);

      if (!raw) return null;

      const { data, ts } = JSON.parse(raw);

      if (Date.now() - ts > CACHE_TTL) return null;

      return Array.isArray(data) ? data : null;

    } catch {

      return null;

    }

  }, []);



  const writeCache = useCallback((data: Store[]) => {

    try {

      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));

    } catch {

      /* ignore */

    }

  }, []);



  const fetchSponsors = useCallback(

    async (force = false) => {

      if (!force) {

        const cached = readCache();

        if (cached) {

          setSponsors(cached);

          setLoading(false);

          setError(null);

          return;

        }

      }

      try {

        setLoading(true);

        const response = await getStores();

        if (response.success && response.stores) {

          setSponsors(response.stores);

          writeCache(response.stores);

          setError(null);

        } else {

          setError(response.error || "Failed to fetch sponsors");

          toast.error(response.error || "Failed to fetch sponsors");

        }

      } catch (err) {

        console.error("Error fetching sponsors:", err);

        setError("An error occurred while fetching sponsors");

      } finally {

        setLoading(false);

      }

    },

    [readCache, writeCache]

  );



  useEffect(() => {

    fetchSponsors();

  }, [fetchSponsors]);



  // ---- Memoized derived data ----

  const activeCount = useMemo(

    () => sponsors.filter((s) => s.status === "active" || s.status === "featured").length,

    [sponsors]

  );



  const filtered = useMemo(() => {

    const query = q.trim().toLowerCase();

    return sponsors.filter((s) => {

      if (filter === "Featured" && !s.featured) return false;

      if (filter === "Active" && s.status !== "active" && s.status !== "featured") return false;

      if (filter === "Expiring" && s.status !== "expiring") return false;

      if (filter === "Expired" && s.status !== "expired") return false;

      if (filter === "Pending" && s.status !== "pending") return false;

      if (query && !s.name.toLowerCase().includes(query) && !s.city.toLowerCase().includes(query))

        return false;

      return true;

    });

  }, [sponsors, filter, q]);



  const selectedPlan = useMemo(

    () => plans.find((p) => p.id === selectedPlanId) || null,

    [plans, selectedPlanId]

  );



  const handleStatusChange = async (
    storeId: string,
    nextStatus: "ACTIVE" | "RESTRICTED"
  ) => {
    if (!storeId) return;

    setUpdatingStatusId(storeId);

    try {
      const result = await changeStoreStatus(storeId, nextStatus);

      if (!result.success) {
        toast.error(result.error || "Failed to update status");
        return;
      }

      setSponsors((current) => {
        const next = current.map((s) =>
          (s.storeId || s.id) === storeId
            ? { ...s, status: nextStatus.toLowerCase() }
            : s
        );

        writeCache(next);
        return next;
      });

      toast.success(`Store status updated to ${nextStatus}`);
    } catch (err) {
      console.error("Status update failed:", err);
      toast.error("Failed to update status");
    } finally {
      // Always re-enable the dropdown after the request finishes.
      setUpdatingStatusId(null);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {

    e.preventDefault();

    setFormError(null);

    if (!form.name.trim() || !form.email.trim() || !form.password) {

      setFormError("Name, email, and password are required.");

      return;

    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {

      setFormError("Please enter a valid email address.");

      return;

    }

    if (form.password.length < 6) {

      setFormError("Password must be at least 6 characters.");

      return;

    }

    setCreating(true);

    try {

      const result = await createStore({

        name: form.name.trim(),

        email: form.email.trim(),

        password: form.password,

      });

      if (result.success) {

        toast.success("Store created successfully");

        setShowCreateModal(false);

        setForm({ name: "", email: "", password: "" });

        await fetchSponsors(true);

      } else {

        setFormError(result.error || "Failed to create store");

      }

    } catch (err) {

      console.error("Create store failed:", err);

      setFormError("An error occurred while creating the store");

    } finally {

      setCreating(false);

    }

  };



  // ---- Assign plan flow ----

  const openAssignModal = async (store: Store) => {

    setAssignTarget(store);

    setSelectedPlanId("");

    setPlansLoading(true);



    // fetch plans (cached in state so we don't refetch per row click)

    if (plans.length === 0) {

      const res = await getPlans();

      if (res.success) {

        setPlans(res.plans);

      } else {

        toast.error(res.error || "Failed to fetch plans");

        setAssignTarget(null);

        setPlansLoading(false);

        return;

      }

    }

    setPlansLoading(false);

  };



  const handleAssignPlan = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!assignTarget || !selectedPlanId) return;



    setAssigning(true);

    try {

      const result = await assignPlan(assignTarget.storeId || assignTarget.id, selectedPlanId);



      if (result.success && result.subscription) {

        const { plan, expiryDate, amountPaid } = result.subscription;

        const formattedExpiry = new Date(expiryDate).toLocaleDateString();



        setSponsors((current) => {

          const next = current.map((s) =>

            (s.storeId || s.id) === (assignTarget.storeId || assignTarget.id)

              ? { ...s, plan: plan.name, expiryDate: formattedExpiry, amount: amountPaid }

              : s

          );

          writeCache(next);

          return next;

        });



        toast.success(`${plan.name} assigned to ${assignTarget.name}`);

        setAssignTarget(null);

      } else {

        toast.error(result.error || "Failed to assign plan");

      }

    } catch (err) {

      console.error("Assign plan failed:", err);

      toast.error("An error occurred while assigning the plan");

    } finally {

      setAssigning(false);

    }

  };



  // ---- Skeleton loading ----

  if (loading) {

    return (

      <>

        <AdminTopbar title="Sponsors" subtitle="Manage store admins and their plans" />

        <div className="px-6 lg:px-10 py-8 space-y-5">

          <Card className="p-3 flex items-center gap-2">

            <div className="flex gap-2">

              {Array.from({ length: 6 }).map((_, i) => (

                <div key={i} className="h-8 w-20 rounded-md bg-muted animate-pulse" />

              ))}

            </div>

            <div className="ml-auto h-9 w-64 rounded-md bg-muted animate-pulse" />

          </Card>

          <Card className="overflow-hidden">

            <div className="border-b border-border bg-muted/40 px-5 py-3 flex gap-8">

              {["Sponsor", "Location", "Plan", "Status", "Expiry", "Amount"].map((h) => (

                <div key={h} className="h-3 w-20 rounded bg-muted animate-pulse" />

              ))}

            </div>

            {Array.from({ length: 5 }).map((_, i) => (

              <div key={i} className="flex items-center gap-6 px-5 py-4 border-b border-border last:border-0">

                <div className="flex items-center gap-3 flex-1">

                  <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />

                  <div className="space-y-2">

                    <div className="h-3.5 w-40 rounded bg-muted animate-pulse" />

                    <div className="h-3 w-52 rounded bg-muted animate-pulse" />

                  </div>

                </div>

                <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />

                <div className="h-3.5 w-16 rounded bg-muted animate-pulse" />

                <div className="h-9 w-28 rounded-md bg-muted animate-pulse" />

                <div className="h-3.5 w-20 rounded bg-muted animate-pulse" />

                <div className="h-3.5 w-16 rounded bg-muted animate-pulse" />

              </div>

            ))}

          </Card>

        </div>

      </>

    );

  }



  if (error && sponsors.length === 0) {

    return (

      <>

        <AdminTopbar title="Sponsors" subtitle="Manage store admins and their plans" />

        <div className="px-6 lg:px-10 py-8">

          <Card className="p-6 text-center">

            <p className="text-red-500">{error}</p>

            <button

              onClick={() => fetchSponsors(true)}

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

      <AdminTopbar title="Sponsors" subtitle={`${sponsors.length} total · ${activeCount} active`} />



      <div className="px-6 lg:px-10 py-8 space-y-5">

        {/* Toolbar */}

        <Card className="p-3 flex flex-wrap items-center gap-2">

          <div className="flex gap-1 flex-wrap">

            {filters.map((f) => (

              <button

                key={f}

                onClick={() => setFilter(f)}

                className={`h-8 px-3 rounded-md text-xs font-medium transition-colors ${

                  filter === f

                    ? "bg-primary text-primary-foreground"

                    : "text-muted-foreground hover:bg-muted"

                }`}

              >

                {f}

                {f === "All" && <span className="ml-1.5 text-[10px] opacity-70">{sponsors.length}</span>}

              </button>

            ))}

          </div>

          <div className="ml-auto flex items-center gap-2">

            <input

              value={q}

              onChange={(e) => setQ(e.target.value)}

              placeholder="Search by name or city…"

              className="h-9 w-56 lg:w-64 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"

            />

            <button

              onClick={() => fetchSponsors(true)}

              title="Refresh"

              className="h-9 px-3 rounded-md border border-border bg-card hover:bg-muted text-xs"

            >

              ⟳

            </button>

            <button

              onClick={() => setShowCreateModal(true)}

              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-95"

            >

              <Plus className="h-4 w-4" /> New sponsor

            </button>

          </div>

        </Card>



        {/* Table */}

        <Card className="overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">

                  <th className="font-medium px-5 py-3">Sponsor</th>

                  <th className="font-medium px-5 py-3">Location</th>

                  <th className="font-medium px-5 py-3">Plan</th>

                  <th className="font-medium px-5 py-3">Status</th>

                  <th className="font-medium px-5 py-3">Expiry</th>

                  <th className="font-medium px-5 py-3 text-right">Amount</th>

                  <th className="font-medium px-5 py-3 text-right">Views</th>

                  <th className="px-5 py-3" />

                </tr>

              </thead>

              <tbody>

                {filtered.map((s) => (

                  <tr key={s.storeId || s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">

                    <td className="px-5 py-4">

                      <Link to="/sponsors/$id" params={{ id: s.id }} className="flex items-center gap-3 group">

                        {s.logo ? (

                          <img src={s.logo} alt={s.name} className="h-10 w-10 rounded-lg object-cover border border-border bg-white shadow-soft" />

                        ) : (

                          <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.logoBg} grid place-items-center font-display text-base text-navy shadow-soft`}>

                            {s.name[0]}

                          </div>

                        )}

                        <div className="min-w-0">

                          <div className="font-medium text-foreground group-hover:text-[oklch(0.45_0.1_75)] transition-colors">{s.name}</div>

                          <div className="text-xs text-muted-foreground truncate max-w-[260px]">{s.email}</div>

                        </div>

                      </Link>

                    </td>

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-1.5 text-foreground">

                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />

                        {s.city || "-"}

                      </div>

                      <div className="text-xs text-muted-foreground mt-0.5">

                        {s.state} · {s.branches?.length || 0} branch{s.branches && s.branches.length !== 1 ? "es" : ""}

                      </div>

                    </td>

                    {/* Plan — clickable to assign */}

                    <td className="px-5 py-4">

                      <button

                        onClick={() => openAssignModal(s)}

                        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-colors ${

                          s.plan && s.plan !== "-"

                            ? "border-border bg-muted/50 text-foreground hover:bg-muted"

                            : "border-dashed border-gold/60 text-gold hover:bg-gold/10"

                        }`}

                      >

                        <Crown className="h-3.5 w-3.5" />

                        {s.plan && s.plan !== "-" ? s.plan : "Assign plan"}

                      </button>

                    </td>

                    <td className="px-5 py-4">

                      <select

                        value={s.status ? s.status.toUpperCase() : "ACTIVE"}

                        onChange={(e) => handleStatusChange(s.storeId || s.id, e.target.value as "ACTIVE" | "RESTRICTED")}

                        disabled={updatingStatusId === (s.storeId || s.id)}

                        className="h-9 min-w-[130px] rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"

                      >

                        <option value="ACTIVE">ACTIVE</option>

                        <option value="RESTRICTED">RESTRICTED</option>

                      </select>

                    </td>

                    <td className="px-5 py-4 text-muted-foreground">{s.expiryDate}</td>

                    <td className="px-5 py-4 text-right tabular-nums">{inrFull(s.amount)}</td>

                    <td className="px-5 py-4 text-right text-muted-foreground tabular-nums">{s.views.toLocaleString("en-IN")}</td>

                    <td className="px-3 py-4 text-right">

                      <button className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground">

                        <MoreHorizontal className="h-4 w-4" />

                      </button>

                    </td>

                  </tr>

                ))}

                {filtered.length === 0 && (

                  <tr>

                    <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">

                      No sponsors match your filters.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

          <div className="flex items-center justify-between px-5 py-3 text-xs text-muted-foreground border-t border-border">

            <div>Showing {filtered.length} of {sponsors.length} sponsors</div>

            <div className="flex items-center gap-1">

              <button className="h-7 px-2.5 rounded-md border border-border hover:bg-muted">Previous</button>

              <button className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground">1</button>

              <button className="h-7 px-2.5 rounded-md border border-border hover:bg-muted">Next</button>

            </div>

          </div>

        </Card>

      </div>



      {/* Create Store Modal */}

      {showCreateModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !creating && setShowCreateModal(false)} />

          <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-xl">

            <div className="flex items-center justify-between px-6 py-4 border-b border-border">

              <h2 className="text-base font-semibold">New sponsor</h2>

              <button onClick={() => !creating && setShowCreateModal(false)} className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground">

                <X className="h-4 w-4" />

              </button>

            </div>

            <form onSubmit={handleCreateStore} className="px-6 py-5 space-y-4">

              {formError && (

                <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-500">

                  {formError}

                </div>

              )}

              <div>

                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Store name <span className="text-red-500">*</span></label>

                <input

                  type="text"

                  value={form.name}

                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}

                  placeholder="e.g. Sri Jewellers"

                  disabled={creating}

                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"

                />

              </div>

              <div>

                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Store admin email <span className="text-red-500">*</span></label>

                <input

                  type="email"

                  value={form.email}

                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}

                  placeholder="admin@store.com"

                  disabled={creating}

                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"

                />

              </div>

              <div>

                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Password <span className="text-red-500">*</span></label>

                <input

                  type="password"

                  value={form.password}

                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}

                  placeholder="Min. 6 characters"

                  disabled={creating}

                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"

                />

                <p className="mt-1 text-[11px] text-muted-foreground">A store account will be created with these login credentials.</p>

              </div>

              <div className="flex justify-end gap-2 pt-2">

                <button type="button" onClick={() => setShowCreateModal(false)} disabled={creating} className="h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-60">

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={creating}

                  className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-2"

                >

                  {creating && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />}

                  {creating ? "Creating…" : "Create store"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* Assign Plan Modal */}

      {assignTarget && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !assigning && setAssignTarget(null)} />

          <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-xl">

            <div className="flex items-center justify-between px-6 py-4 border-b border-border">

              <div>

                <h2 className="text-base font-semibold">Assign plan</h2>

                <p className="text-xs text-muted-foreground mt-0.5">{assignTarget.name} · {assignTarget.email}</p>

              </div>

              <button onClick={() => !assigning && setAssignTarget(null)} className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground">

                <X className="h-4 w-4" />

              </button>

            </div>



            <form onSubmit={handleAssignPlan} className="px-6 py-5 space-y-4">

              {plansLoading ? (

                <div className="space-y-2">

                  {Array.from({ length: 3 }).map((_, i) => (

                    <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />

                  ))}

                </div>

              ) : plans.length === 0 ? (

                <div className="text-sm text-muted-foreground text-center py-4">

                  No plans found. Create a plan first in <strong>Membership Plans</strong>.

                </div>

              ) : (

                <div className="space-y-2 max-h-72 overflow-y-auto">

                  {plans.map((p) => (

                    <label

                      key={p.id}

                      className={`flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer transition-colors ${

                        selectedPlanId === p.id

                          ? "border-gold bg-gold/10"

                          : "border-border hover:bg-muted/50"

                      }`}

                    >

                      <div className="flex items-center gap-3">

                        <input

                          type="radio"

                          name="plan"

                          value={p.id}

                          checked={selectedPlanId === p.id}

                          onChange={() => setSelectedPlanId(p.id)}

                          className="accent-gold"

                        />

                        <div>

                          <div className="text-sm font-medium">{p.name}</div>

                          <div className="text-xs text-muted-foreground">{p.months} month{p.months !== 1 ? "s" : ""}</div>

                        </div>

                      </div>

                      <div className="text-sm font-semibold tabular-nums">{inrFull(p.cost)}</div>

                    </label>

                  ))}

                </div>

              )}



              {selectedPlan && (

                <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">

                  New expiry will be set to <strong>{new Date(new Date().setMonth(new Date().getMonth() + selectedPlan.months)).toLocaleDateString()}</strong> · Amount <strong>{inrFull(selectedPlan.cost)}</strong>

                </div>

              )}



              <div className="flex justify-end gap-2 pt-2">

                <button

                  type="button"

                  onClick={() => setAssignTarget(null)}

                  disabled={assigning}

                  className="h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-60"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={assigning || !selectedPlanId || plans.length === 0}

                  className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-2"

                >

                  {assigning && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />}

                  {assigning ? "Assigning…" : "Assign plan"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </>

  );

}
