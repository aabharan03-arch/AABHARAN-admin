// Aabharan mock data — realistic seed for the admin UI
export type SponsorStatus = "active" | "expiring" | "expired" | "pending" | "featured";
export type PlanTier = "Silver" | "Gold" | "Diamond" | "Platinum";

export interface Branch {
  id: string;
  name: string;
  manager: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  lat: number;
  lng: number;
}

export interface Sponsor {
  id: string;
  name: string;
  logoBg: string; // gradient seed
  description: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  gst: string;
  city: string;
  state: string;
  plan: PlanTier;
  status: SponsorStatus;
  featured: boolean;
  startDate: string;
  expiryDate: string;
  amount: number;
  views: number;
  clicks: number;
  branches: Branch[];
  galleryCount: number;
  category: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  sponsorId: string;
  sponsorName: string;
  plan: PlanTier;
  amount: number;
  discount: number;
  method: "UPI" | "Bank Transfer" | "Cash" | "Cheque" | "Card";
  txnRef: string;
  invoiceNo: string;
  collectedBy: string;
  date: string;
  status: "paid" | "pending" | "refunded";
}

export interface Plan {
  id: string;
  name: PlanTier;
  durationMonths: number;
  amount: number;
  benefits: string[];
  active: boolean;
  sponsors: number;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  registered: string;
  lastSeen: string;
  saved: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sponsors: number;
  active: boolean;
}

export interface AdminNotification {
  id: string;
  type: "expiring" | "payment" | "new_sponsor" | "new_user";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const cities = [
  ["Mumbai", "Maharashtra"], ["Delhi", "Delhi"], ["Bengaluru", "Karnataka"],
  ["Chennai", "Tamil Nadu"], ["Hyderabad", "Telangana"], ["Jaipur", "Rajasthan"],
  ["Surat", "Gujarat"], ["Kolkata", "West Bengal"], ["Pune", "Maharashtra"],
  ["Ahmedabad", "Gujarat"], ["Coimbatore", "Tamil Nadu"], ["Lucknow", "Uttar Pradesh"],
] as const;

const houseNames = [
  "Tanishq", "Malabar Gold", "Kalyan Jewellers", "PC Jeweller", "Joyalukkas",
  "Tribhovandas Bhimji Zaveri", "Senco Gold", "Bhima Jewellers", "Reliance Jewels",
  "Waman Hari Pethe", "Mehrasons", "GRT Jewellers", "Lalithaa Jewellery",
  "PNG Jewellers", "Khazana Jewellery", "Khanna Jewellers", "ORRA",
];

const gradients = [
  "from-amber-200 to-yellow-500", "from-rose-200 to-amber-400",
  "from-yellow-300 to-orange-500", "from-stone-200 to-amber-500",
  "from-amber-100 to-yellow-400", "from-yellow-200 to-amber-600",
];

const plansList: PlanTier[] = ["Silver", "Gold", "Diamond", "Platinum"];
const planAmount: Record<PlanTier, number> = {
  Silver: 12000, Gold: 28000, Diamond: 60000, Platinum: 120000,
};

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}
function daysFromNow(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function statusFor(daysToExpiry: number): SponsorStatus {
  if (daysToExpiry < 0) return "expired";
  if (daysToExpiry <= 30) return "expiring";
  return "active";
}

export const sponsors: Sponsor[] = Array.from({ length: 18 }, (_, i) => {
  const [city, state] = pick(cities, i);
  const plan = pick(plansList, i + 1);
  const daysLeft = [180, 22, -10, 65, 5, 140, -45, 12, 200, 88, 30, 7, 110, 250, -3, 45, 18, 95][i];
  const status = i === 0 || i === 3 || i === 8 ? "featured" : statusFor(daysLeft);
  return {
    id: `spn_${1001 + i}`,
    name: pick(houseNames, i),
    logoBg: pick(gradients, i),
    description: `Heritage jewellery house with handcrafted ${plan.toLowerCase()} collections.`,
    email: `contact@${houseNames[i % houseNames.length].toLowerCase().replace(/[^a-z]/g, "")}.com`,
    phone: `+91 ${90000 + i * 137}${10000 + i * 23}`.slice(0, 17),
    whatsapp: `+91 ${90000 + i * 137}${10000 + i * 23}`.slice(0, 17),
    website: `www.${houseNames[i % houseNames.length].toLowerCase().replace(/[^a-z]/g, "")}.com`,
    gst: `27AABCU${9000 + i}A1Z${i % 10}`,
    city, state,
    plan,
    status,
    featured: status === "featured",
    startDate: daysFromNow(daysLeft - 365),
    expiryDate: daysFromNow(daysLeft),
    amount: planAmount[plan],
    views: 1200 + i * 380 + (i % 5) * 220,
    clicks: 80 + i * 27,
    galleryCount: 12 + ((i * 7) % 40),
    category: pick(["Gold", "Diamond", "Silver", "Platinum", "Temple", "Antique"], i),
    createdAt: daysFromNow(-200 - i * 9),
    branches: Array.from({ length: 1 + (i % 3) }, (_, b) => ({
      id: `br_${i}_${b}`,
      name: `${pick(houseNames, i)} — ${["Main", "Mall Branch", "Heritage Wing"][b] ?? "Branch"}`,
      manager: ["Rohan Sharma", "Priya Iyer", "Aditya Mehta", "Neha Kapoor", "Vikram Singh"][(i + b) % 5],
      phone: `+91 98${100 + i}${200 + b}${340}`.slice(0, 17),
      city, state,
      pincode: `${400000 + i * 23 + b * 7}`,
      address: `${10 + b}, ${["MG Road", "Linking Road", "Brigade Road", "Park Street"][b % 4]}, ${city}`,
      lat: 19.07 + (i % 7) * 0.08 - b * 0.03,
      lng: 72.87 + (i % 5) * 0.06 + b * 0.02,
    })),
  };
});

export const plans: Plan[] = plansList.map((name, i) => ({
  id: `pln_${i + 1}`,
  name,
  durationMonths: 12,
  amount: planAmount[name],
  benefits: [
    `${["3", "8", "20", "Unlimited"][i]} gallery collections`,
    `${["100", "500", "2000", "Unlimited"][i]} jewellery images`,
    `${["1", "3", "10", "Unlimited"][i]} branch listings`,
    i >= 1 ? "Homepage placement eligibility" : "Standard listing",
    i >= 2 ? "Priority featured slot" : "",
    i === 3 ? "Dedicated account manager" : "",
  ].filter(Boolean),
  active: true,
  sponsors: sponsors.filter((s) => s.plan === name).length,
}));

export const payments: Payment[] = sponsors.flatMap((s, i) => {
  const base: Payment = {
    id: `pay_${4000 + i}`,
    sponsorId: s.id,
    sponsorName: s.name,
    plan: s.plan,
    amount: s.amount,
    discount: i % 4 === 0 ? 2000 : 0,
    method: pick(["UPI", "Bank Transfer", "Cash", "Cheque", "Card"] as const, i),
    txnRef: `TXN${800000 + i * 137}`,
    invoiceNo: `INV-2025-${1000 + i}`,
    collectedBy: pick(["Admin", "Sneha Reddy", "Karthik Rao"], i),
    date: s.startDate,
    status: s.status === "pending" ? "pending" : "paid",
  };
  if (i % 5 === 0) {
    return [base, { ...base, id: `pay_${5000 + i}`, date: daysFromNow(-(i * 11)), invoiceNo: `INV-2024-${900 + i}` }];
  }
  return [base];
});

export const users: AppUser[] = Array.from({ length: 24 }, (_, i) => {
  const [city] = pick(cities, i);
  return {
    id: `usr_${7000 + i}`,
    name: ["Aanya Verma", "Ishaan Gupta", "Diya Patel", "Kabir Joshi", "Meera Pillai", "Arav Khanna", "Tara Bose", "Vihaan Shah"][i % 8] + ` ${i + 1}`,
    email: `user${i + 1}@aabharan.in`,
    phone: `+91 98${100 + i}${500 + i * 3}${20}`.slice(0, 17),
    city,
    registered: daysFromNow(-(i * 4 + 3)),
    lastSeen: daysFromNow(-(i % 9)),
    saved: (i * 3) % 12,
  };
});

export const categories: Category[] = [
  "Gold", "Diamond", "Silver", "Platinum", "Temple Jewellery",
  "Antique", "Gemstones", "Machinery", "CAD/CAM", "Testing Labs", "Education",
].map((name, i) => ({
  id: `cat_${i + 1}`,
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-").replace(/\//g, "-"),
  sponsors: sponsors.filter((s) => s.category === name.split(" ")[0]).length || (3 + i),
  active: i < 9,
}));

export const notifications: AdminNotification[] = [
  { id: "n1", type: "expiring", title: "Membership expiring in 7 days", body: "Kalyan Jewellers — Platinum plan expires Dec 03", time: "12 min ago", read: false },
  { id: "n2", type: "payment", title: "Payment received", body: "₹60,000 from PC Jeweller via UPI", time: "1 hr ago", read: false },
  { id: "n3", type: "new_sponsor", title: "New sponsor created", body: "Bhima Jewellers added by Arjun Nair", time: "3 hrs ago", read: false },
  { id: "n4", type: "new_user", title: "12 new user registrations today", body: "Across Mumbai, Bengaluru, Jaipur", time: "5 hrs ago", read: true },
  { id: "n5", type: "expiring", title: "3 memberships expiring in 30 days", body: "Diamond and Gold plans pending renewal", time: "Yesterday", read: true },
];

// Dashboard aggregates
export const kpis = {
  totalSponsors: sponsors.length,
  activeSponsors: sponsors.filter((s) => s.status === "active" || s.status === "featured").length,
  featuredSponsors: sponsors.filter((s) => s.featured).length,
  expiredSponsors: sponsors.filter((s) => s.status === "expired").length,
  renewalsDue: sponsors.filter((s) => s.status === "expiring").length,
  todayRevenue: 88000,
  weeklyRevenue: 412000,
  monthlyRevenue: 1864000,
  lifetimeRevenue: payments.reduce((a, p) => a + (p.amount - p.discount), 0),
  totalUsers: users.length * 47,
  newUsersToday: 12,
  galleryImages: sponsors.reduce((a, s) => a + s.galleryCount, 0),
  totalCategories: categories.length,
};

export const revenueSeries = [
  { month: "May", revenue: 920000, sponsors: 8 },
  { month: "Jun", revenue: 1140000, sponsors: 11 },
  { month: "Jul", revenue: 1330000, sponsors: 13 },
  { month: "Aug", revenue: 1520000, sponsors: 14 },
  { month: "Sep", revenue: 1480000, sponsors: 15 },
  { month: "Oct", revenue: 1720000, sponsors: 17 },
  { month: "Nov", revenue: 1864000, sponsors: 18 },
];

export const planDistribution = plans.map((p) => ({ name: p.name, value: p.sponsors || 1 }));

export const sponsorsByState = Object.entries(
  sponsors.reduce<Record<string, number>>((a, s) => ((a[s.state] = (a[s.state] || 0) + 1), a), {}),
).map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count);

export const userGrowth = Array.from({ length: 14 }, (_, i) => ({
  day: `Day ${i + 1}`,
  users: 40 + Math.round(Math.sin(i / 2) * 14) + i * 3,
}));

export function inr(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}
export function inrFull(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
