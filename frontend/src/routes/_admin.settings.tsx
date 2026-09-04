import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card, SectionTitle } from "@/components/admin/ui-bits";
import { TextField, Toggle, PrimaryButton, GhostButton } from "@/components/admin/forms";
import { useAdmin } from "@/lib/store";
import { exportJson } from "@/lib/export";
import { Building, User, Bell, Shield, CreditCard, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Tab = "org" | "profile" | "notifications" | "security" | "billing";

export const Route = createFileRoute("/_admin/settings")({
  head: () => ({ meta: [{ title: "Settings · Aabharan Admin" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({
    tab: (["org", "profile", "notifications", "security", "billing"] as const).includes(s.tab as Tab)
      ? (s.tab as Tab)
      : undefined,
  }),
  component: SettingsPage,
});

const tabs = [
] as const;

function SettingsPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const active: Tab = tab ?? "org";
  const { state, dispatch } = useAdmin();
  const [org, setOrg] = useState(state.org);
  const [profile, setProfile] = useState(state.profile);

  return (
    <>
      <AdminTopbar title="Settings" subtitle="Workspace and account preferences" />
      <div className="px-6 lg:px-10 py-8 grid gap-6 lg:grid-cols-[220px_1fr] max-w-5xl">
        <nav className="space-y-1">
          {tabs.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => navigate({ to: "/settings", search: { tab: s.id } })}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  active === s.id ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-6">
          {active === "org" && (
            <>
              <Card className="p-6">
                <SectionTitle title="Organisation details" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <TextField label="Legal name" value={org.legalName} onChange={(v) => setOrg({ ...org, legalName: v })} />
                  <TextField label="Trading as" value={org.tradingAs} onChange={(v) => setOrg({ ...org, tradingAs: v })} />
                  <TextField label="Support email" value={org.supportEmail} onChange={(v) => setOrg({ ...org, supportEmail: v })} />
                  <TextField label="Phone" value={org.phone} onChange={(v) => setOrg({ ...org, phone: v })} />
                  <TextField label="GSTIN" value={org.gstin} onChange={(v) => setOrg({ ...org, gstin: v })} />
                  <TextField label="Country" value={org.country} onChange={(v) => setOrg({ ...org, country: v })} />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <GhostButton onClick={() => setOrg(state.org)}>Discard</GhostButton>
                  <PrimaryButton onClick={() => { dispatch({ type: "org/update", patch: org }); toast.success("Organisation details saved"); }}>
                    Save changes
                  </PrimaryButton>
                </div>
              </Card>

              
            </>
          )}

          {active === "profile" && (
            <Card className="p-6">
              <SectionTitle title="Your profile" />
              <div className="grid sm:grid-cols-2 gap-4">
                <TextField label="Full name" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} />
                <TextField label="Email" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} />
                <TextField label="Role" value={profile.role} onChange={(v) => setProfile({ ...profile, role: v })} />
                <TextField label="Initials" value={profile.initials} onChange={(v) => setProfile({ ...profile, initials: v.slice(0, 2).toUpperCase() })} />
              </div>
              <div className="mt-6 flex justify-end">
                <PrimaryButton onClick={() => { dispatch({ type: "profile/update", patch: profile }); toast.success("Profile updated"); }}>
                  Save profile
                </PrimaryButton>
              </div>
            </Card>
          )}

          {active === "notifications" && (
            <Card className="p-6">
              <SectionTitle title="Notification preferences" />
              <div className="divide-y divide-border">
                <Toggle label="Membership expiry alerts" description="Notify 30, 7 and 1 day before expiry."
                  checked={state.notifPrefs.expiryAlerts} onChange={(v) => { dispatch({ type: "prefs/update", patch: { expiryAlerts: v } }); toast.success(`Expiry alerts ${v ? "on" : "off"}`); }} />
                <Toggle label="Payment received" description="Alert whenever a payment is recorded."
                  checked={state.notifPrefs.paymentAlerts} onChange={(v) => dispatch({ type: "prefs/update", patch: { paymentAlerts: v } })} />
                <Toggle label="New sponsor added" description="Alert when staff create a sponsor."
                  checked={state.notifPrefs.newSponsorAlerts} onChange={(v) => dispatch({ type: "prefs/update", patch: { newSponsorAlerts: v } })} />
                <Toggle label="Weekly digest" description="Monday summary of revenue and renewals."
                  checked={state.notifPrefs.weeklyDigest} onChange={(v) => dispatch({ type: "prefs/update", patch: { weeklyDigest: v } })} />
              </div>
            </Card>
          )}

          {active === "security" && (
            <Card className="p-6 space-y-4">
              <SectionTitle title="Security" />
              <p className="text-sm text-muted-foreground">Password and session controls for your staff account.</p>
              <div className="flex flex-wrap gap-2">
                <GhostButton onClick={() => toast.success("Password reset link sent", { description: state.profile.email })}>Send password reset</GhostButton>
                <GhostButton onClick={() => toast.success("All other sessions signed out")}>Sign out other sessions</GhostButton>
                <GhostButton onClick={() => exportJson("aabharan-admin-data.json", state)}>
                  <Download className="h-3.5 w-3.5" /> Export workspace data
                </GhostButton>
              </div>
            </Card>
          )}

          {active === "billing" && (
            <Card className="p-6">
              <SectionTitle title="Billing" />
              <div className="rounded-xl border border-gold/30 bg-gold/10 p-5 flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Aabharan Enterprise</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Unlimited sponsors · 5 staff seats · renews 01 Apr 2027</div>
                </div>
                <PrimaryButton onClick={() => toast.success("Invoice downloaded", { description: "INV-AAB-2026-04" })}>
                  Download invoice
                </PrimaryButton>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
