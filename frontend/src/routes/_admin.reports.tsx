import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card } from "@/components/admin/ui-bits";
import { FileSpreadsheet, FileText, Download, IndianRupee, Building2, Crown, Wallet, Users, Image as ImageIcon } from "lucide-react";

const reports = [
  { id: "revenue", title: "Revenue report", desc: "All payments, discounts and net revenue by period", icon: IndianRupee },
  { id: "sponsors", title: "Sponsors report", desc: "All sponsors with plan, status, location and stats", icon: Building2 },
  { id: "memberships", title: "Membership renewals", desc: "Upcoming, recent and expired memberships", icon: Crown },
  { id: "payments", title: "Payment ledger", desc: "Transaction-level export with collector attribution", icon: Wallet },
  { id: "users", title: "User registrations", desc: "Consumer app registrations with engagement", icon: Users },
  { id: "uploads", title: "Image uploads", desc: "Gallery uploads by sponsor and category", icon: ImageIcon },
];

export const Route = createFileRoute("/_admin/reports")({
  head: () => ({ meta: [{ title: "Reports · Aabharan Admin" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <>
      <AdminTopbar title="Reports" subtitle="Generate exports across the platform" />
      <div className="px-6 lg:px-10 py-8 space-y-6">
        <Card className="p-5 flex items-center gap-4 flex-wrap">
          <div className="text-sm text-foreground"><span className="text-muted-foreground">Range:</span> Nov 1 – Nov 26, 2025</div>
          <div className="ml-auto flex items-center gap-2">
            <select className="h-9 px-3 rounded-md border border-border bg-background text-sm">
              <option>Last 30 days</option><option>This month</option><option>This quarter</option><option>Year to date</option><option>Custom range</option>
            </select>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => {
            const Icon = r.icon;
            return (
              <Card key={r.id} className="p-5 hover:shadow-elevated transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-gold/15 text-[oklch(0.5_0.13_75)] grid place-items-center">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4">
                  <div className="font-medium text-foreground">{r.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{r.desc}</div>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <button className="flex-1 h-9 rounded-md border border-border bg-card hover:bg-muted text-xs font-medium inline-flex items-center justify-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                  </button>
                  <button className="flex-1 h-9 rounded-md border border-border bg-card hover:bg-muted text-xs font-medium inline-flex items-center justify-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> CSV
                  </button>
                  <button className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:opacity-95">
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
