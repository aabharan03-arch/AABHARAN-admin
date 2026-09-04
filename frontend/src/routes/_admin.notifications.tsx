import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card } from "@/components/admin/ui-bits";
import { notifications } from "@/lib/mock-data";
import { AlertTriangle, Wallet, Building2, Users, CheckCheck } from "lucide-react";

const iconMap = {
  expiring: AlertTriangle,
  payment: Wallet,
  new_sponsor: Building2,
  new_user: Users,
} as const;

export const Route = createFileRoute("/_admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Aabharan Admin" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <>
      <AdminTopbar
        title="Notifications"
        subtitle={`${notifications.filter((n) => !n.read).length} unread`}
        actions={
          <button className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        }
      />
      <div className="px-6 lg:px-10 py-8 max-w-3xl">
        <Card className="overflow-hidden">
          {notifications.map((n, i) => {
            const Icon = iconMap[n.type];
            return (
              <div key={n.id} className={`flex items-start gap-4 p-5 ${i < notifications.length - 1 ? "border-b border-border" : ""} ${!n.read ? "bg-gold/[0.03]" : ""}`}>
                <div className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 ${
                  n.type === "expiring" ? "bg-warning/15 text-[oklch(0.45_0.13_75)]" :
                  n.type === "payment" ? "bg-success/10 text-success" :
                  n.type === "new_sponsor" ? "bg-gold/15 text-[oklch(0.5_0.13_75)]" :
                  "bg-primary/5 text-primary"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-foreground">{n.title}</div>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{n.time}</div>
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}
