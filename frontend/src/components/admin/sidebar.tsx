import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, Crown, Wallet, ImageIcon,
  Users, FileBarChart, Settings, LogOut,
} from "lucide-react";
import { useAdmin, useStats } from "@/lib/store";
import { ConfirmDialog } from "./modal";
import { useState } from "react";
import { toast } from "sonner";
import type { AdminUser } from "@/lib/api";
import logoImg from "../assests/logo.jpeg";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sponsors", label: "Store Admins", icon: Building2 },
  { to: "/plans", label: "Membership Plans", icon: Crown },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/gallery", label: "Gallery", icon: ImageIcon },
  { to: "/users", label: "Enquires", icon: Users },
] as const;

export function AdminSidebar({
  onSignOut,
  admin,
}: {
  onSignOut: () => void;
  admin: AdminUser | null;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { state, dispatch } = useAdmin();
  const stats = useStats();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const initials = admin?.email ? admin.email.slice(0, 2).toUpperCase() : "AD";

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0 overflow-y-auto">
      <div className="sticky top-0 bg-sidebar z-50 px-6 pt-6 pb-7">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0 shadow-lg border border-gold/30">
            <img src={logoImg} alt="Aabharan Logo" className="h-full w-full object-cover" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl tracking-wide text-ivory">Aabharan</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">Admin Console</div>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <div className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/45">
          Workspace
        </div>
        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            const badge = item.to === "/notifications" && stats.unread > 0 ? stats.unread : null;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                  active
                    ? "bg-sidebar-accent text-ivory shadow-soft"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-ivory",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-7 w-7 grid place-items-center rounded-md transition-colors",
                    active ? "bg-gold/15 text-gold" : "text-sidebar-foreground/60 group-hover:text-ivory",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.85} />
                </span>
                <span className="truncate">{item.label}</span>
                {badge && (
                  <span className="ml-auto rounded-full bg-gold px-1.5 py-px text-[10px] font-semibold text-navy">{badge}</span>
                )}
                {!badge && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="sticky bottom-0 bg-sidebar border-t border-sidebar-border p-4 space-y-3">
        {admin && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="h-8 w-8 rounded-full bg-gold/15 text-gold grid place-items-center text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-xs font-medium text-ivory truncate">{admin.email}</div>
              <div className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50">{admin.role}</div>
            </div>
          </div>
        )}
        <button
          onClick={() => setConfirmSignOut(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-sidebar-border text-[11px] text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-ivory transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => { dispatch({ type: "reset" }); toast.success("Demo data restored"); }}
        title="Reset demo data?"
        message="All local changes — sponsors, payments, layouts and settings — will be restored to the seeded dataset."
        confirmLabel="Reset everything"
      />

      <ConfirmDialog
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={() => {
          setConfirmSignOut(false);
          onSignOut();
        }}
        title="Sign out?"
        message="Are you sure you want to sign out of your admin account?"
        confirmLabel="Sign out"
      />
    </aside>
  );
}