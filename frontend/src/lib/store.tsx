import {
  createContext, useContext, useEffect, useMemo, useReducer, type ReactNode,
} from "react";
import {
  sponsors as seedSponsors, plans as seedPlans, payments as seedPayments,
  users as seedUsers, categories as seedCategories, notifications as seedNotifications,
  type Sponsor, type Plan, type Payment, type AppUser, type Category,
  type AdminNotification, type Branch, type PlanTier,
} from "./mock-data";

export interface LayoutSection {
  id: string;
  label: string;
  desc: string;
  visible: boolean;
}

export interface OrgSettings {
  legalName: string;
  tradingAs: string;
  supportEmail: string;
  phone: string;
  gstin: string;
  country: string;
}

export interface Profile {
  name: string;
  email: string;
  role: string;
  initials: string;
}

export interface NotifPrefs {
  expiryAlerts: boolean;
  paymentAlerts: boolean;
  newSponsorAlerts: boolean;
  weeklyDigest: boolean;
}

export interface AdminState {
  sponsors: Sponsor[];
  plans: Plan[];
  payments: Payment[];
  users: AppUser[];
  categories: Category[];
  notifications: AdminNotification[];
  homepageSections: LayoutSection[];
  mobileSections: LayoutSection[];
  org: OrgSettings;
  profile: Profile;
  notifPrefs: NotifPrefs;
  homepagePublishedAt: string | null;
  mobilePublishedAt: string | null;
  signedIn: boolean;
}

const homepageSeed: LayoutSection[] = [
  { id: "hero", label: "Hero Banner", desc: "Featured editorial banner with rotating jewellery collections", visible: true },
  { id: "featured", label: "Featured Sponsors", desc: "Hand-picked premium sponsors · 6 slots", visible: true },
  { id: "gold", label: "Gold Sponsors", desc: "Auto-filled from Gold plan sponsors", visible: true },
  { id: "diamond", label: "Diamond Sponsors", desc: "Auto-filled from Diamond plan sponsors", visible: true },
  { id: "categories", label: "Categories Grid", desc: "Shop by category — active categories", visible: true },
  { id: "nearby", label: "Nearby Stores", desc: "Geo-aware sponsor showcase using user location", visible: true },
  { id: "new", label: "New Arrivals", desc: "Latest 12 jewellery uploads across the platform", visible: true },
  { id: "trending", label: "Trending Collections", desc: "Most-viewed collections in the last 7 days", visible: false },
  { id: "footer", label: "Footer", desc: "Brand information, links, social and contact", visible: true },
];

const mobileSeed: LayoutSection[] = [
  { id: "m-hero", label: "Hero Carousel", desc: "Full-bleed swipeable banner · 5 slides", visible: true },
  { id: "m-cats", label: "Quick Categories", desc: "Icon row of 8 top categories", visible: true },
  { id: "m-featured", label: "Featured Sponsors", desc: "Editorial cards from featured sponsors", visible: true },
  { id: "m-near", label: "Near Me", desc: "Location-sorted store list · 10 items", visible: true },
  { id: "m-diamond", label: "Diamond Sponsors", desc: "Auto-filled from Diamond plan", visible: true },
  { id: "m-gold", label: "Gold Sponsors", desc: "Auto-filled from Gold plan", visible: true },
  { id: "m-new", label: "New Arrivals", desc: "Latest uploads feed", visible: true },
  { id: "m-saved", label: "Saved For You", desc: "Personalised from user saves", visible: false },
  { id: "m-footer", label: "Footer", desc: "App links, support and legal", visible: true },
];

const initialState: AdminState = {
  sponsors: seedSponsors,
  plans: seedPlans,
  payments: seedPayments,
  users: seedUsers,
  categories: seedCategories,
  notifications: seedNotifications,
  homepageSections: homepageSeed,
  mobileSections: mobileSeed,
  org: {
    legalName: "Aabharan Jewellers Pvt. Ltd.",
    tradingAs: "Aabharan",
    supportEmail: "support@aabharan.in",
    phone: "+91 80 4567 8900",
    gstin: "29AABCU9603R1ZJ",
    country: "India",
  },
  profile: { name: "Arjun Nair", email: "arjun@aabharan.in", role: "Owner · Admin", initials: "AN" },
  notifPrefs: { expiryAlerts: true, paymentAlerts: true, newSponsorAlerts: true, weeklyDigest: false },
  homepagePublishedAt: null,
  mobilePublishedAt: null,
  signedIn: true,
};

type Action =
  | { type: "hydrate"; state: AdminState }
  | { type: "sponsor/add"; sponsor: Sponsor }
  | { type: "sponsor/update"; id: string; patch: Partial<Sponsor> }
  | { type: "sponsor/delete"; id: string }
  | { type: "sponsor/toggleFeatured"; id: string }
  | { type: "sponsor/renew"; id: string; months: number }
  | { type: "branch/add"; sponsorId: string; branch: Branch }
  | { type: "branch/delete"; sponsorId: string; branchId: string }
  | { type: "plan/add"; plan: Plan }
  | { type: "plan/update"; id: string; patch: Partial<Plan> }
  | { type: "plan/delete"; id: string }
  | { type: "payment/add"; payment: Payment }
  | { type: "payment/update"; id: string; patch: Partial<Payment> }
  | { type: "payment/delete"; id: string }
  | { type: "user/delete"; id: string }
  | { type: "category/add"; category: Category }
  | { type: "category/update"; id: string; patch: Partial<Category> }
  | { type: "category/delete"; id: string }
  | { type: "notif/read"; id: string }
  | { type: "notif/readAll" }
  | { type: "notif/clear" }
  | { type: "notif/add"; notif: AdminNotification }
  | { type: "layout/move"; surface: "homepage" | "mobile"; id: string; dir: -1 | 1 }
  | { type: "layout/toggle"; surface: "homepage" | "mobile"; id: string }
  | { type: "layout/update"; surface: "homepage" | "mobile"; id: string; patch: Partial<LayoutSection> }
  | { type: "layout/publish"; surface: "homepage" | "mobile"; at: string }
  | { type: "org/update"; patch: Partial<OrgSettings> }
  | { type: "profile/update"; patch: Partial<Profile> }
  | { type: "prefs/update"; patch: Partial<NotifPrefs> }
  | { type: "session/set"; signedIn: boolean }
  | { type: "reset" };

function moveInList(list: LayoutSection[], id: string, dir: -1 | 1) {
  const i = list.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function recountPlans(state: AdminState): AdminState {
  return {
    ...state,
    plans: state.plans.map((p) => ({ ...p, sponsors: state.sponsors.filter((s) => s.plan === p.name).length })),
  };
}

function reducer(state: AdminState, action: Action): AdminState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "sponsor/add":
      return recountPlans({ ...state, sponsors: [action.sponsor, ...state.sponsors] });
    case "sponsor/update":
      return recountPlans({
        ...state,
        sponsors: state.sponsors.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      });
    case "sponsor/delete":
      return recountPlans({
        ...state,
        sponsors: state.sponsors.filter((s) => s.id !== action.id),
        payments: state.payments.filter((p) => p.sponsorId !== action.id),
      });
    case "sponsor/toggleFeatured":
      return {
        ...state,
        sponsors: state.sponsors.map((s) =>
          s.id === action.id
            ? { ...s, featured: !s.featured, status: !s.featured ? "featured" : "active" }
            : s,
        ),
      };
    case "sponsor/renew": {
      return {
        ...state,
        sponsors: state.sponsors.map((s) => {
          if (s.id !== action.id) return s;
          const base = new Date(s.expiryDate) > new Date() ? new Date(s.expiryDate) : new Date();
          base.setMonth(base.getMonth() + action.months);
          return {
            ...s,
            expiryDate: base.toISOString().slice(0, 10),
            status: s.featured ? "featured" : "active",
          };
        }),
      };
    }
    case "branch/add":
      return {
        ...state,
        sponsors: state.sponsors.map((s) =>
          s.id === action.sponsorId ? { ...s, branches: [...s.branches, action.branch] } : s,
        ),
      };
    case "branch/delete":
      return {
        ...state,
        sponsors: state.sponsors.map((s) =>
          s.id === action.sponsorId
            ? { ...s, branches: s.branches.filter((b) => b.id !== action.branchId) }
            : s,
        ),
      };
    case "plan/add":
      return { ...state, plans: [...state.plans, action.plan] };
    case "plan/update":
      return { ...state, plans: state.plans.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)) };
    case "plan/delete":
      return { ...state, plans: state.plans.filter((p) => p.id !== action.id) };
    case "payment/add":
      return { ...state, payments: [action.payment, ...state.payments] };
    case "payment/update":
      return { ...state, payments: state.payments.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)) };
    case "payment/delete":
      return { ...state, payments: state.payments.filter((p) => p.id !== action.id) };
    case "user/delete":
      return { ...state, users: state.users.filter((u) => u.id !== action.id) };
    case "category/add":
      return { ...state, categories: [...state.categories, action.category] };
    case "category/update":
      return { ...state, categories: state.categories.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) };
    case "category/delete":
      return { ...state, categories: state.categories.filter((c) => c.id !== action.id) };
    case "notif/read":
      return { ...state, notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)) };
    case "notif/readAll":
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    case "notif/clear":
      return { ...state, notifications: [] };
    case "notif/add":
      return { ...state, notifications: [action.notif, ...state.notifications] };
    case "layout/move":
      return action.surface === "homepage"
        ? { ...state, homepageSections: moveInList(state.homepageSections, action.id, action.dir) }
        : { ...state, mobileSections: moveInList(state.mobileSections, action.id, action.dir) };
    case "layout/toggle": {
      const key = action.surface === "homepage" ? "homepageSections" : "mobileSections";
      return { ...state, [key]: state[key].map((s) => (s.id === action.id ? { ...s, visible: !s.visible } : s)) };
    }
    case "layout/update": {
      const key = action.surface === "homepage" ? "homepageSections" : "mobileSections";
      return { ...state, [key]: state[key].map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)) };
    }
    case "layout/publish":
      return action.surface === "homepage"
        ? { ...state, homepagePublishedAt: action.at }
        : { ...state, mobilePublishedAt: action.at };
    case "org/update":
      return { ...state, org: { ...state.org, ...action.patch } };
    case "profile/update":
      return { ...state, profile: { ...state.profile, ...action.patch } };
    case "prefs/update":
      return { ...state, notifPrefs: { ...state.notifPrefs, ...action.patch } };
    case "session/set":
      return { ...state, signedIn: action.signedIn };
    case "reset":
      return initialState;
    default:
      return state;
  }
}

const STORAGE_KEY = "aabharan-admin-state-v1";

// Initialize state with profile from localStorage if available
function getInitialState(): AdminState {
  try {
    // Try to load admin profile from login
    const profileRaw = localStorage.getItem("aabharan_admin_profile");
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      return {
        ...initialState,
        profile: {
          name: profile.name || "Admin",
          email: profile.email || "admin@aabharan.in",
          role: profile.role || "admin",
          initials: profile.initials || "AD",
        },
      };
    }
  } catch {
    // ignore corrupt cache
  }
  return initialState;
}

interface Ctx {
  state: AdminState;
  dispatch: React.Dispatch<Action>;
}
const StoreContext = createContext<Ctx | null>(null);

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, getInitialState());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", state: { ...initialState, ...JSON.parse(raw) } });
    } catch {
      /* ignore corrupt cache */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminStoreProvider");
  return ctx;
}

export function useStats() {
  const { state } = useAdmin();
  return useMemo(() => {
    const paid = state.payments.filter((p) => p.status === "paid");
    const lifetime = paid.reduce((a, p) => a + (p.amount - p.discount), 0);
    return {
      totalSponsors: state.sponsors.length,
      activeSponsors: state.sponsors.filter((s) => s.status === "active" || s.status === "featured").length,
      featuredSponsors: state.sponsors.filter((s) => s.featured).length,
      expiredSponsors: state.sponsors.filter((s) => s.status === "expired").length,
      renewalsDue: state.sponsors.filter((s) => s.status === "expiring").length,
      todayRevenue: 88000,
      weeklyRevenue: 412000,
      monthlyRevenue: Math.round(lifetime / 6),
      lifetimeRevenue: lifetime,
      totalUsers: state.users.length * 47,
      newUsersToday: 12,
      galleryImages: state.sponsors.reduce((a, s) => a + s.galleryCount, 0),
      totalCategories: state.categories.length,
      unread: state.notifications.filter((n) => !n.read).length,
    };
  }, [state]);
}

export const planTiers: PlanTier[] = ["Silver", "Gold", "Diamond", "Platinum"];

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
