// app/routes/_admin.plans.tsx
import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card } from "@/components/admin/ui-bits";
import { Check, Plus, Crown, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createPlan, getPlans, updatePlan, type Plan } from "@/lib/api";

export const Route = createFileRoute("/_admin/plans")({
  head: () => ({ meta: [{ title: "Membership Plans · Aabharan Admin" }] }),
  component: PlansPage,
});

function inrFull(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// Module-level cache — persists across route navigations within the same
// session (not across full page reloads), so switching away from /plans
// and back doesn't refetch unless explicitly refreshed or after a mutation.
let plansCache: Plan[] | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let plansCacheFetchedAt = 0;

function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>(plansCache ?? []);
  const [loading, setLoading] = useState(plansCache === null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const fetchPlans = async (force = false) => {
    const isFresh = plansCache !== null && Date.now() - plansCacheFetchedAt < CACHE_TTL_MS;

    if (!force && isFresh) {
      setPlans(plansCache!);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const response = await getPlans();
      if (response.success) {
        plansCache = response.plans;
        plansCacheFetchedAt = Date.now();
        setPlans(response.plans);
        setError(null);
      } else {
        setError(response.error || "Failed to fetch plans");
        toast.error(response.error || "Failed to fetch plans");
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
      setError("An error occurred while fetching plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setModalOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setModalOpen(true);
  };

  const handleSaved = (savedPlan: Plan, wasEdit: boolean) => {
    const updated = wasEdit
      ? plans.map((p) => (p.id === savedPlan.id ? savedPlan : p))
      : [...plans, savedPlan];

    setPlans(updated);
    // Keep the module-level cache in sync so other mounts of this page
    // (e.g. navigating away and back) see the mutation immediately.
    plansCache = updated;
    plansCacheFetchedAt = Date.now();

    setModalOpen(false);
    setEditingPlan(null);
  };

  // Derived, memoized values — recomputed only when the plans list changes,
  // not on every render (e.g. when the modal opens/closes).
  const subtitle = useMemo(() => {
    if (loading) return "Loading...";
    return `${plans.length} plan${plans.length !== 1 ? "s" : ""} configured`;
  }, [loading, plans.length]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.cost - b.cost),
    [plans]
  );

  return (
    <>
      <AdminTopbar
        title="Membership Plans"
        subtitle={subtitle}
        actions={
          ""
        }
      />

      <div className="px-6 lg:px-10 py-8 space-y-5">
        {/* Fallback create bar — always visible regardless of topbar actions rendering */}
        <div className="flex justify-end">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> New plan
          </button>
        </div>

        {loading ? (
          <PlansSkeleton />
        ) : error ? (
          <Card className="p-6 text-center text-red-500">{error}</Card>
        ) : sortedPlans.length === 0 ? (
          <Card className="p-10 text-center space-y-4">
            <p className="text-muted-foreground">No plans yet. Create your first membership plan to get started.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95"
            >
              <Plus className="h-4 w-4" /> Create plan
            </button>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {sortedPlans.map((p, i) => (
              <Card key={p.id} className="p-6 relative overflow-hidden">
                {i === sortedPlans.length - 1 && sortedPlans.length > 1 && (
                  <div className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-[oklch(0.5_0.13_75)]">
                    <Sparkles className="h-3 w-3" /> Newest
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-display text-2xl text-foreground">{p.name}</h3>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl text-foreground">{inrFull(p.cost)}</span>
                    <span className="text-xs text-muted-foreground">
                      / {p.months} mo{p.months !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
                  <span>Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => openEdit(p)}
                    className="text-foreground hover:text-[oklch(0.45_0.1_75)] font-medium"
                  >
                    Edit →
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <PlanFormModal
          plan={editingPlan}
          onClose={() => {
            setModalOpen(false);
            setEditingPlan(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

function PlansSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-6 overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
            <div className="h-6 w-24 rounded bg-muted animate-pulse" />
          </div>
          <div className="mt-4">
            <div className="h-9 w-32 rounded bg-muted animate-pulse" />
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="h-3 w-12 rounded bg-muted animate-pulse" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function PlanFormModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: Plan | null;
  onClose: () => void;
  onSaved: (plan: Plan, wasEdit: boolean) => void;
}) {
  const isEdit = !!plan;
  const [name, setName] = useState(plan?.name ?? "");
  const [months, setMonths] = useState(plan?.months?.toString() ?? "");
  const [cost, setCost] = useState(plan?.cost?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const monthsNum = parseInt(months, 10);
    const costNum = parseFloat(cost);

    if (!name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    if (!Number.isInteger(monthsNum) || monthsNum <= 0) {
      toast.error("Months must be a positive whole number");
      return;
    }
    if (isNaN(costNum) || costNum < 0) {
      toast.error("Cost must be a valid non-negative number");
      return;
    }

    setSaving(true);
    try {
      const result = isEdit
        ? await updatePlan(plan!.id, { name: name.trim(), months: monthsNum, cost: costNum })
        : await createPlan(name.trim(), monthsNum, costNum);

      if (result.success && result.plan) {
        toast.success(isEdit ? "Plan updated" : "Plan created");
        onSaved(result.plan, isEdit);
      } else {
        toast.error(result.error || "Failed to save plan");
      }
    } catch (err) {
      console.error("Save plan error:", err);
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-foreground">
            {isEdit ? "Edit plan" : "New plan"}
          </h2>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">Plan name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gold"
              className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Duration (months)</label>
            <input
              type="number"
              min={1}
              step={1}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              placeholder="e.g. 6"
              className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Cost (₹)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g. 5000"
              className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}