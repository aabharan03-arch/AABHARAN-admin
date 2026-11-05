import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card } from "@/components/admin/ui-bits";
import {
  Plus,
  Crown,
  Sparkles,
  X,
  Package,
  Image,
  Megaphone,
  Layers3,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  createPlan,
  getPlans,
  updatePlan,
  type Plan,
} from "@/lib/api";

export const Route = createFileRoute(
  "/_admin/plans"
)({
  head: () => ({
    meta: [
      {
        title:
          "Membership Plans · Aabharan Admin",
      },
    ],
  }),
  component: PlansPage,
});

function inrFull(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

let plansCache: Plan[] | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;
let plansCacheFetchedAt = 0;

function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>(
    plansCache ?? []
  );
  const [loading, setLoading] = useState(
    plansCache === null
  );
  const [error, setError] = useState<
    string | null
  >(null);
  const [modalOpen, setModalOpen] =
    useState(false);
  const [editingPlan, setEditingPlan] =
    useState<Plan | null>(null);

  const fetchPlans = async (
    force = false
  ) => {
    const isFresh =
      plansCache !== null &&
      Date.now() - plansCacheFetchedAt <
        CACHE_TTL_MS;

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
        setError(
          response.error ||
            "Failed to fetch plans"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlans();
  }, []);

  const sortedPlans = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          a.priority - b.priority ||
          a.cost - b.cost
      ),
    [plans]
  );

  const handleSaved = (
    saved: Plan,
    wasEdit: boolean
  ) => {
    const next = wasEdit
      ? plans.map((plan) =>
          plan.id === saved.id
            ? saved
            : plan
        )
      : [...plans, saved];

    setPlans(next);
    plansCache = next;
    plansCacheFetchedAt = Date.now();
    setEditingPlan(null);
    setModalOpen(false);
  };

  return (
    <>
      <AdminTopbar
        title="Membership Plans"
        subtitle={`${plans.length} plan${
          plans.length === 1 ? "" : "s"
        } configured`}
      />

      <div className="px-6 lg:px-10 py-8 space-y-5">
        <div className="flex justify-end">
          <button
            onClick={() => {
              setEditingPlan(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New plan
          </button>
        </div>

        {loading ? (
          <Card className="p-10 text-center">
            Loading plans…
          </Card>
        ) : error ? (
          <Card className="p-6 text-center text-red-500">
            {error}
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {sortedPlans.map((plan) => (
              <Card
                key={plan.id}
                className="p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    <h3 className="font-display text-2xl">
                      {plan.name}
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Priority {plan.priority}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="font-display text-4xl">
                    {inrFull(plan.cost)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    / {plan.months} month
                    {plan.months !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="mt-6 space-y-3 text-sm">
                  <Feature
                    icon={Package}
                    label="Products"
                    value={
                      plan.maxProducts === null
                        ? "Unlimited"
                        : String(
                            plan.maxProducts
                          )
                    }
                  />
                  <Feature
                    icon={Image}
                    label="Cover photos"
                    value={String(
                      plan.maxCoverPhotos
                    )}
                  />
                  <Feature
                    icon={Megaphone}
                    label="Advertisement photos"
                    value={String(
                      plan.maxAdvertisePhotos
                    )}
                  />
                  <Feature
                    icon={Sparkles}
                    label="Popup"
                    value={
                      plan.popupEnabled
                        ? "Enabled"
                        : "Disabled"
                    }
                  />
                  <Feature
                    icon={Layers3}
                    label="Public priority"
                    value={String(
                      plan.priority
                    )}
                  />
                </div>

                <button
                  onClick={() => {
                    setEditingPlan(plan);
                    setModalOpen(true);
                  }}
                  className="mt-6 w-full h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted"
                >
                  Edit plan
                </button>
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

function Feature({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="font-medium">
        {value}
      </span>
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
  onSaved: (
    plan: Plan,
    wasEdit: boolean
  ) => void;
}) {
  const isEdit = !!plan;

  const [name, setName] = useState(
    plan?.name ?? ""
  );
  const [months, setMonths] = useState(
    plan?.months?.toString() ?? "1"
  );
  const [cost, setCost] = useState(
    plan?.cost?.toString() ?? "0"
  );

  const [maxProducts, setMaxProducts] =
    useState(
      plan?.maxProducts === null
        ? ""
        : plan?.maxProducts?.toString() ??
            "20"
    );

  const [
    unlimitedProducts,
    setUnlimitedProducts,
  ] = useState(
    plan?.maxProducts === null
  );

  const [
    maxCoverPhotos,
    setMaxCoverPhotos,
  ] = useState(
    plan?.maxCoverPhotos?.toString() ??
      "0"
  );

  const [
    maxAdvertisePhotos,
    setMaxAdvertisePhotos,
  ] = useState(
    plan?.maxAdvertisePhotos?.toString() ??
      "0"
  );

  const [popupEnabled, setPopupEnabled] =
    useState(
      plan?.popupEnabled ?? false
    );

  const [priority, setPriority] =
    useState(
      plan?.priority?.toString() ?? "1"
    );

  const [saving, setSaving] =
    useState(false);

  const submit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const payload = {
      name: name.trim(),
      months: Number(months),
      cost: Number(cost),
      maxProducts: unlimitedProducts
        ? null
        : Number(maxProducts),
      maxCoverPhotos:
        Number(maxCoverPhotos),
      maxAdvertisePhotos:
        Number(maxAdvertisePhotos),
      popupEnabled,
      priority: Number(priority),
    };

    if (!payload.name) {
      toast.error(
        "Plan name is required"
      );
      return;
    }

    const numericFields = [
      payload.months,
      payload.cost,
      payload.maxCoverPhotos,
      payload.maxAdvertisePhotos,
      payload.priority,
    ];

    if (
      numericFields.some(
        (value) =>
          !Number.isFinite(value) ||
          value < 0
      ) ||
      payload.months <= 0 ||
      (!unlimitedProducts &&
        (!Number.isInteger(
          payload.maxProducts
        ) ||
          Number(payload.maxProducts) <
            0))
    ) {
      toast.error(
        "Please enter valid plan limits."
      );
      return;
    }

    setSaving(true);

    try {
      const result = isEdit
        ? await updatePlan(plan!.id, payload)
        : await createPlan(payload);

      if (
        result.success &&
        result.plan
      ) {
        toast.success(
          isEdit
            ? "Plan updated. Store Admin limits are now updated."
            : "Plan created"
        );

        onSaved(
          result.plan,
          isEdit
        );
      } else {
        toast.error(
          result.error ||
            "Failed to save plan"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
        <div className="sticky top-0 bg-card flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-display text-xl">
              {isEdit
                ? "Edit plan"
                : "New plan"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Changes to limits take effect for assigned Store Admins immediately.
            </p>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="p-6 space-y-4"
        >
          <Field
            label="Plan name"
            value={name}
            onChange={setName}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Months"
              value={months}
              onChange={setMonths}
              type="number"
            />
            <Field
              label="Cost"
              value={cost}
              onChange={setCost}
              type="number"
            />
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="font-medium">
              Store Admin restrictions
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              These values are read directly by Store Admin APIs.
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              checked={unlimitedProducts}
              onChange={(e) =>
                setUnlimitedProducts(
                  e.target.checked
                )
              }
            />
            <span className="text-sm">
              Unlimited products
            </span>
          </label>

          {!unlimitedProducts && (
            <Field
              label="Maximum products"
              value={maxProducts}
              onChange={setMaxProducts}
              type="number"
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Maximum cover photos"
              value={maxCoverPhotos}
              onChange={setMaxCoverPhotos}
              type="number"
            />
            <Field
              label="Maximum advertisement photos"
              value={maxAdvertisePhotos}
              onChange={
                setMaxAdvertisePhotos
              }
              type="number"
            />
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              checked={popupEnabled}
              onChange={(e) =>
                setPopupEnabled(
                  e.target.checked
                )
              }
            />
            <span className="text-sm">
              Popup feature enabled
            </span>
          </label>

          <Field
            label="Public priority"
            value={priority}
            onChange={setPriority}
            type="number"
          />

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-border text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
            >
              {saving
                ? "Saving…"
                : isEdit
                ? "Save changes"
                : "Create plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium">
        {label}
      </label>
      <input
        type={type}
        min={
          type === "number"
            ? 0
            : undefined
        }
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
      />
    </div>
  );
}
