// components/admin/topbar.tsx
import {
  Search, Bell, ChevronDown, Command, LogOut, User, Settings as SettingsIcon,
  Building2, Wallet, Users as UsersIcon, Crown,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAdmin, useStats } from "@/lib/store";
import { Menu, MenuItem, MenuSeparator } from "./menu";
import { Modal } from "./modal";
import { logoutAdmin, getPlans, type Plan } from "@/lib/api";

export function AdminTopbar({ title, subtitle, actions }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode; // ✅ now accepted AND rendered
}) {
  const { state } = useAdmin();
  const stats = useStats();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [q, setQ] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    getPlans().then((res) => {
      if (res.success) setPlans(res.plans);
    });
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) {
      return {
        sponsors: state.sponsors.slice(0, 5),
        payments: [],
        users: [],
        plans: plans.slice(0, 4),
      };
    }
    return {
      sponsors: state.sponsors
        .filter((s) => `s.name{s.name}s.name{s.city} ${s.email}`.toLowerCase().includes(term))
        .slice(0, 6),
      payments: state.payments
        .filter((p) => `p.invoiceNo{p.invoiceNo}p.invoiceNo{p.sponsorName} ${p.txnRef}`.toLowerCase().includes(term))
        .slice(0, 4),
      users: state.users
        .filter((u) => `u.name{u.name}u.name{u.email} ${u.city}`.toLowerCase().includes(term))
        .slice(0, 4),
      plans: plans.filter((p) => p.name.toLowerCase().includes(term)).slice(0, 4),
    };
  }, [q, state, plans]);

  const go = (fn: () => void) => {
    setPaletteOpen(false);
    setQ("");
    fn();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center gap-4 px-6 lg:px-10 h-16">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground -mt-0.5">{subtitle}</p>}
        </div>

        <div className="hidden md:flex ml-6 flex-1 max-w-lg">
          <button
            onClick={() => setPaletteOpen(true)}
            className="relative w-full h-10 pl-10 pr-16 rounded-lg bg-card border border-border text-sm text-muted-foreground text-left hover:bg-muted/60 transition-colors shadow-soft"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            Search sponsors, plans, payments, users...
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Command className="h-3 w-3" /> K
            </kbd>
          </button>
        </div>

        {/* ✅ THE FIX — right-side cluster renders page actions first */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {actions}

          <button className="relative h-9 w-9 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>

          <Menu
            trigger={
              <button className="flex items-center gap-2 h-9 pl-1.5 pr-2 rounded-lg hover:bg-muted">
                <span className="h-6 w-6 rounded-full bg-primary/15 grid place-items-center text-primary">
                  <User className="h-3.5 w-3.5" />
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            }
          >
            <MenuItem onClick={() => navigate({ to: "/sponsors" })}>
              <User className="h-4 w-4" /> Profile
            </MenuItem>
            <MenuItem onClick={() => navigate({ to: "/plans" })}>
              <SettingsIcon className="h-4 w-4" /> Settings
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              onClick={async () => {
                await logoutAdmin();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="h-4 w-4" /> Log out
            </MenuItem>
          </Menu>
        </div>
      </div>

      <Modal
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        title="Search"
        description="Jump to any sponsor, plan, invoice or user."
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a name, city, invoice number…"
          className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <div className="mt-4 max-h-[52vh] overflow-y-auto space-y-4">
          <ResultGroup icon={Building2} label="Sponsors" empty={results.sponsors.length === 0}>
            {results.sponsors.map((s) => (
              <button
                key={s.id}
                onClick={() => go(() => navigate({ to: "/sponsors/$id", params: { id: s.id } }))}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted flex items-center justify-between"
              >
                <span className="text-sm text-foreground">{s.name}</span>
                <span className="text-[11px] text-muted-foreground">{s.city} · {s.plan}</span>
              </button>
            ))}
          </ResultGroup>

          {results.plans.length > 0 && (
            <ResultGroup icon={Crown} label="Plans">
              {results.plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => go(() => navigate({ to: "/plans" }))}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted flex items-center justify-between"
                >
                  <span className="text-sm text-foreground">{p.name}</span>
                  <span className="text-[11px] text-muted-foreground">₹{p.cost.toLocaleString("en-IN")} · {p.months} mo</span>
                </button>
              ))}
            </ResultGroup>
          )}

          {results.payments.length > 0 && (
            <ResultGroup icon={Wallet} label="Payments">
              {results.payments.map((p) => (
                <button
                  key={p.id}
                  onClick={() => go(() => navigate({ to: "/payments" }))}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted flex items-center justify-between"
                >
                  <span className="text-sm text-foreground">{p.invoiceNo}</span>
                  <span className="text-[11px] text-muted-foreground">{p.sponsorName}</span>
                </button>
              ))}
            </ResultGroup>
          )}

          {results.users.length > 0 && (
            <ResultGroup icon={UsersIcon} label="Users">
              {results.users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => go(() => navigate({ to: "/users" }))}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted flex items-center justify-between"
                >
                  <span className="text-sm text-foreground">{u.name}</span>
                  <span className="text-[11px] text-muted-foreground">{u.city}</span>
                </button>
              ))}
            </ResultGroup>
          )}
        </div>
      </Modal>
    </header>
  );
}

function ResultGroup({ icon: Icon, label, children, empty }: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      {empty ? <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div> : children}
    </div>
  );
}
