import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card, SectionTitle, StatusPill } from "@/components/admin/ui-bits";
import { inr, inrFull } from "@/lib/mock-data";
import {
  getStores,
  getPlans,
  getPayments,
  type Store,
  type Plan,
  type Payment,
  type PaymentSummary,
} from "@/lib/api";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  TrendingUp, Users, Gem, Crown, AlertTriangle, IndianRupee, Building2, Tags, Plus, ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/_admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Aabharan Admin" }] }),
  component: DashboardPage,
});

const GOLD = "oklch(0.76 0.13 85)";
const NAVY = "oklch(0.22 0.045 265)";
const CHAMP = "oklch(0.86 0.085 85)";
const STEEL = "oklch(0.55 0.08 220)";
const GREEN = "oklch(0.62 0.13 155)";
const PALETTE = [CHAMP, GOLD, NAVY, STEEL, GREEN];

const RENEWAL_WINDOW_DAYS = 30;
const TREND_DAYS = 14;
const REVENUE_MONTHS = 6;

// Cache keys
const CACHE_KEYS = {
  STORES: "dashboard_stores",
  PLANS: "dashboard_plans",
  PAYMENTS: "dashboard_payments",
  SUMMARY: "dashboard_summary",
};

// ---------- Auth error detection helper ----------------

function checkIsAuthError(error: unknown): boolean {
  if (!error) return false;
  const str = typeof error === "string" ? error : JSON.stringify(error);
  const lowerError = str.toLowerCase();
  return (
    lowerError.includes("token") ||
    lowerError.includes("unauthorized") ||
    lowerError.includes("expired") ||
    lowerError.includes("401") ||
    lowerError.includes("missing") ||
    lowerError.includes("invalid token")
  );
}

// ---------- Local cache helpers ----------------

function setCache(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Failed to set cache:", e);
  }
}

function getCache<T>(key: string): T | null {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.warn("Failed to get cache:", e);
    return null;
  }
}

function clearCache() {
  Object.values(CACHE_KEYS).forEach((key) => {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn("Failed to clear cache:", e);
    }
  });
}

// ---------- Date helpers ----------------

function parseLoose(dateStr: string | undefined | null): Date | null {
  if (!dateStr || dateStr === "-") return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short" });
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

// ---------- Derived-data builders ----------------

function buildRevenueSeries(payments: Payment[]) {
  const now = new Date();
  const buckets: { key: string; month: string; revenue: number }[] = [];
  for (let i = REVENUE_MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: monthKey(d), month: monthLabel(d), revenue: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const p of payments) {
    const paid = parseLoose(p.paidAt);
    if (!paid || p.status !== "PAID") continue;
    const bucket = byKey.get(monthKey(paid));
    if (bucket) bucket.revenue += p.amount;
  }
  return buckets;
}

function buildDailyTrend(payments: Payment[]) {
  const now = new Date();
  const buckets: { key: string; day: string; count: number }[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.push({ key: dayKey(d), day: dayLabel(d), count: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const p of payments) {
    const paid = parseLoose(p.paidAt);
    if (!paid) continue;
    const bucket = byKey.get(dayKey(paid));
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

function buildPlanDistribution(stores: Store[], plans: Plan[]) {
  const counts = new Map<string, number>();
  for (const plan of plans) counts.set(plan.name, 0);
  let noPlan = 0;
  for (const s of stores) {
    if (s.plan && s.plan !== "-") {
      counts.set(s.plan, (counts.get(s.plan) ?? 0) + 1);
    } else {
      noPlan += 1;
    }
  }
  const dist = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);
  if (noPlan > 0) dist.push({ name: "No plan", value: noPlan });
  return dist;
}

// ---------- KPI card ----------------

function Kpi({ label, value, delta, icon: Icon, tone = "navy" }: {
  label: string; value: string; delta?: string; icon: React.ElementType; tone?: "navy" | "gold" | "success" | "warning";
}) {
  const toneCls = {
    navy: "bg-primary/5 text-primary",
    gold: "bg-gold/15 text-[oklch(0.5_0.13_75)]",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-[oklch(0.45_0.13_75)]",
  }[tone];
  return (
    <Card className="p-5 hover:shadow-elevated transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-3xl text-foreground">{value}</div>
          {delta && (
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-success">
              <ArrowUpRight className="h-3 w-3" /> {delta}
            </div>
          )}
        </div>
        <div className={`h-10 w-10 rounded-lg grid place-items-center ${toneCls}`}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card className="p-5">
      <div className="h-3 w-20 bg-muted rounded animate-pulse" />
      <div className="h-8 w-16 bg-muted rounded mt-3 animate-pulse" />
    </Card>
  );
}

// ---------- Page Component ----------------

function DashboardPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({ today: 0, week: 0, month: 0, lifetime: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authFailed, setAuthFailed] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    setAuthFailed(false);

    try {
      const [storesRes, plansRes, paymentsRes] = await Promise.all([
        getStores(),
        getPlans(),
        getPayments(),
      ]);

      const storesError = !storesRes.success ? storesRes.error : null;
      const plansError = !plansRes.success ? plansRes.error : null;
      const paymentsError = !paymentsRes.success ? paymentsRes.error : null;

      const firstError = storesError || plansError || paymentsError || null;

      // Handle Authentication / Token failure
      if (firstError && checkIsAuthError(firstError)) {
        setAuthFailed(true);
        clearCache();
        setError("Session expired. Redirecting to login...");
        setLoading(false);
        navigate({ to: "/login" });
        return;
      }

      let fetchedStores = stores;
      let fetchedPlans = plans;
      let fetchedPayments = payments;

      if (storesRes.success) {
        fetchedStores = storesRes.stores;
        setStores(storesRes.stores);
        setCache(CACHE_KEYS.STORES, storesRes.stores);
      } else {
        const cached = getCache<Store[]>(CACHE_KEYS.STORES);
        if (cached) {
          fetchedStores = cached;
          setStores(cached);
        }
      }

      if (plansRes.success) {
        fetchedPlans = plansRes.plans;
        setPlans(plansRes.plans);
        setCache(CACHE_KEYS.PLANS, plansRes.plans);
      } else {
        const cached = getCache<Plan[]>(CACHE_KEYS.PLANS);
        if (cached) {
          fetchedPlans = cached;
          setPlans(cached);
        }
      }

      if (paymentsRes.success) {
        fetchedPayments = paymentsRes.payments;
        setPayments(paymentsRes.payments);
        setSummary(paymentsRes.summary);
        setCache(CACHE_KEYS.PAYMENTS, paymentsRes.payments);
        setCache(CACHE_KEYS.SUMMARY, paymentsRes.summary);
      } else {
        const cachedPayments = getCache<Payment[]>(CACHE_KEYS.PAYMENTS);
        const cachedSummary = getCache<PaymentSummary>(CACHE_KEYS.SUMMARY);
        if (cachedPayments) {
          fetchedPayments = cachedPayments;
          setPayments(cachedPayments);
        }
        if (cachedSummary) setSummary(cachedSummary);
      }

      if (firstError && fetchedStores.length === 0 && fetchedPlans.length === 0 && fetchedPayments.length === 0) {
        setError(firstError);
      }
    } catch (e) {
      console.error("Dashboard data load error:", e);
      if (checkIsAuthError(e)) {
        setAuthFailed(true);
        clearCache();
        navigate({ to: "/login" });
        return;
      }
      setError("An unexpected error occurred while fetching dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Correctly recompute derived values with dependency arrays attached
  const totalSponsors = stores.length;

  const activeSponsors = useMemo(
    () => stores.filter((s) => s.status === "active").length,
    [stores]
  );

  const premiumSponsors = useMemo(
    () => stores.filter((s) => s.plan === "Premium").length,
    [stores]
  );

  const renewalsDue = useMemo(() => {
    const now = Date.now();
    return stores.filter((s) => {
      const exp = parseLoose(s.expiryDate);
      if (!exp) return false;
      const diffDays = (exp.getTime() - now) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= RENEWAL_WINDOW_DAYS;
    }).length;
  }, [stores]);

  const totalBranches = useMemo(
    () => stores.reduce((sum, s) => sum + (s.branches?.length ?? 0), 0),
    [stores]
  );

  const revenueSeries = useMemo(() => buildRevenueSeries(payments), [payments]);
  const dailyTrend = useMemo(() => buildDailyTrend(payments), [payments]);
  const planDistribution = useMemo(() => buildPlanDistribution(stores, plans), [stores, plans]);

  const topSponsors = useMemo(
    () => [...stores].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)).slice(0, 5),
    [stores]
  );

  if (authFailed) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <div className="text-red-600 font-semibold mb-2">Session Expired</div>
            <div className="text-sm text-muted-foreground mb-4">Your authentication token has expired or is invalid.</div>
            <Link
              to="/login"
              className="inline-flex items-center h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95"
            >
              Go to Login
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <AdminTopbar
        title="Dashboard"
        subtitle="Business overview"
        actions={
          <Link to="/sponsors" className="hidden md:inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95">
            <Plus className="h-4 w-4" /> Add sponsor
          </Link>
        }
      />

      <div className="px-6 lg:px-10 py-8 space-y-8">
        {error && (
          <Card className="p-4 text-sm text-red-600">
            {error}{" "}
            <button onClick={load} className="underline ml-2">
              Retry
            </button>
          </Card>
        )}

        {/* KPI strip */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <Kpi label="Total Sponsors" value={String(totalSponsors)} icon={Gem} tone="gold" />
              <Kpi label="Active" value={String(activeSponsors)} icon={TrendingUp} tone="success" />
              <Kpi label="Premium Plan" value={String(plans.length)} icon={Crown} tone="gold" />
              <Kpi label="Renewals Due (30d)" value={String(renewalsDue)} icon={AlertTriangle} tone="warning" />
              <Kpi
                label="Today's Revenue"
                value={inr(summary.today)}
                delta={summary.week ? `${inr(summary.week)} this week` : undefined}
                icon={IndianRupee}
                tone="navy"
              />
              <Kpi label="Lifetime Revenue" value={inr(summary.lifetime)} icon={IndianRupee} tone="navy" />
            </>
          )}
        </div>

        {/* Revenue chart + plan distribution */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Revenue trend</div>
                <h2 className="font-display text-2xl text-foreground mt-1">
                  {loading ? "…" : inrFull(summary.month)}
                </h2>
                <div className="text-xs text-muted-foreground mt-0.5">This month · last {REVENUE_MONTHS} months shown</div>
              </div>
            </div>
            <div className="h-72">
              {loading ? (
                <div className="h-full w-full bg-muted rounded-lg animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueSeries} margin={{ left: -10, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GOLD} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="oklch(0.91 0.012 85)" vertical={false} />
                    <XAxis dataKey="month" stroke="oklch(0.52 0.015 265)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.52 0.015 265)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => inr(v)} />
                    <Tooltip contentStyle={{ background: "white", border: "1px solid oklch(0.91 0.012 85)", borderRadius: 10, fontSize: 12 }} formatter={(v: number) => inrFull(v)} />
                    <Area type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2.5} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <SectionTitle title="Plan mix" />
            {loading ? (
              <div className="h-48 bg-muted rounded-lg animate-pulse" />
            ) : planDistribution.length === 0 ? (
              <div className="h-48 grid place-items-center text-xs text-muted-foreground">No plan data yet</div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" paddingAngle={3} isAnimationActive={false} stroke="none">
                      {planDistribution.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "white", border: "1px solid oklch(0.91 0.012 85)", borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="space-y-2 mt-2">
              {planDistribution.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="text-foreground">{p.name}</span>
                  </div>
                  <span className="text-muted-foreground">{p.value} sponsors</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Payment activity */}
        <div className="grid gap-6 lg:grid-cols-1">
          <Card className="p-6">
            <SectionTitle title={`Payments · last ${TREND_DAYS} days`} />
            {loading ? (
              <div className="h-64 bg-muted rounded-lg animate-pulse" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrend}>
                    <CartesianGrid stroke="oklch(0.91 0.012 85)" vertical={false} />
                    <XAxis dataKey="day" stroke="oklch(0.52 0.015 265)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.52 0.015 265)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "white", border: "1px solid oklch(0.91 0.012 85)", borderRadius: 10, fontSize: 12 }} />
                    <Line type="monotone" dataKey="count" name="Payments" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3, fill: GREEN }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Quick links + top sponsors + secondary metrics */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-6">
            <SectionTitle
              title="Top sponsors by revenue"
              action={<Link to="/sponsors" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>}
            />
            {loading ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-11 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : topSponsors.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">No sponsors yet</div>
            ) : (
              <div className="divide-y divide-border">
                {topSponsors.map((s) => (
                  <Link key={s.id} to="/sponsors/$id" params={{ id: s.id }}
                    className="flex items-center gap-4 py-3 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-colors">
                    <div className={`h-11 w-11 rounded-lg bg-gradient-to-br ${s.logoBg} grid place-items-center text-navy font-display text-lg shadow-soft`}>
                      {s.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm text-foreground truncate">{s.name}</div>
                        <StatusPill status={s.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.city} · {s.plan} plan</div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-medium text-foreground">{inr(s.amount)}</div>
                      <div className="text-[10px] text-muted-foreground">paid</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 text-success grid place-items-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Active sponsors</div>
                  <div className="font-display text-2xl text-foreground">{loading ? "…" : activeSponsors}</div>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gold/15 text-[oklch(0.5_0.13_75)] grid place-items-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Total branches</div>
                  <div className="font-display text-2xl text-foreground">{loading ? "…" : totalBranches}</div>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/5 text-primary grid place-items-center">
                  <Tags className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Plans available</div>
                  <div className="font-display text-2xl text-foreground">{loading ? "…" : plans.length}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}