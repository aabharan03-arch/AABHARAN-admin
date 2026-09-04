import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card } from "@/components/admin/ui-bits";
import { Smartphone, GripVertical, Eye, Save } from "lucide-react";

export const Route = createFileRoute("/_admin/mobile")({
  head: () => ({ meta: [{ title: "Mobile App Layout · Aabharan Admin" }] }),
  component: MobileLayoutPage,
});

const mobileSections = [
  "Hero Carousel", "Quick Categories", "Featured Sponsors", "Near Me",
  "Diamond Sponsors", "Gold Sponsors", "New Arrivals", "Saved For You", "Footer",
];

function MobileLayoutPage() {
  return (
    <>
      <AdminTopbar
        title="Mobile App Layout"
        subtitle="Order and visibility for the consumer iOS / Android app"
        actions={
          <button className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95">
            <Save className="h-4 w-4" /> Publish to app
          </button>
        }
      />
      <div className="px-6 lg:px-10 py-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {mobileSections.map((s, i) => (
            <Card key={s} className="p-4 flex items-center gap-4">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
              <div className="h-9 w-9 rounded-md bg-muted grid place-items-center text-xs font-semibold text-muted-foreground">{i + 1}</div>
              <div className="flex-1">
                <div className="font-medium text-foreground">{s}</div>
                <div className="text-xs text-muted-foreground">Tap to configure data source and item count</div>
              </div>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </Card>
          ))}
        </div>

        {/* Phone mockup */}
        <Card className="p-6 lg:sticky lg:top-20 h-fit">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-4 flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Live preview</div>
          <div className="mx-auto w-[260px] rounded-[34px] border-[10px] border-navy bg-background shadow-elevated overflow-hidden">
            <div className="h-6 bg-navy" />
            <div className="aspect-[9/19] p-2.5 space-y-2 overflow-hidden">
              <div className="h-24 rounded-xl gold-gradient grid place-items-center font-display text-navy text-sm shadow-soft">Aabharan</div>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-muted grid place-items-center text-[8px] text-muted-foreground">Cat</div>
                ))}
              </div>
              <div className="h-12 rounded-lg bg-muted grid place-items-center text-[10px] text-muted-foreground">Featured Sponsors</div>
              <div className="h-12 rounded-lg bg-muted grid place-items-center text-[10px] text-muted-foreground">Near Me</div>
              <div className="grid grid-cols-2 gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-muted grid place-items-center text-[8px] text-muted-foreground">SP {i + 1}</div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
