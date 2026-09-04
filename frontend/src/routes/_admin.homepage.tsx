import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card } from "@/components/admin/ui-bits";
import { GripVertical, Eye, EyeOff, Settings2, Save } from "lucide-react";

export const Route = createFileRoute("/_admin/homepage")({
  head: () => ({ meta: [{ title: "Homepage Builder · Aabharan Admin" }] }),
  component: HomepageBuilder,
});

const sections = [
  { id: "hero", label: "Hero Banner", desc: "Featured editorial banner with rotating jewellery collections", visible: true },
  { id: "featured", label: "Featured Sponsors", desc: "Hand-picked premium sponsors · 6 slots", visible: true },
  { id: "gold", label: "Gold Sponsors", desc: "Auto-filled from Gold plan sponsors", visible: true },
  { id: "diamond", label: "Diamond Sponsors", desc: "Auto-filled from Diamond plan sponsors", visible: true },
  { id: "categories", label: "Categories Grid", desc: "Shop by category — 11 active categories", visible: true },
  { id: "nearby", label: "Nearby Stores", desc: "Geo-aware sponsor showcase using user location", visible: true },
  { id: "new", label: "New Arrivals", desc: "Latest 12 jewellery uploads across the platform", visible: true },
  { id: "trending", label: "Trending Collections", desc: "Most-viewed collections in the last 7 days", visible: false },
  { id: "footer", label: "Footer", desc: "Brand information, links, social and contact", visible: true },
];

function HomepageBuilder() {
  return (
    <>
      <AdminTopbar
        title="Homepage Builder"
        subtitle="Drag to reorder · toggle visibility · publish when ready"
        actions={
          <>
            <button className="hidden md:inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium">
              <Eye className="h-4 w-4" /> Preview
            </button>
            <button className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95">
              <Save className="h-4 w-4" /> Publish changes
            </button>
          </>
        }
      />
      <div className="px-6 lg:px-10 py-8 grid gap-6 lg:grid-cols-3">
        {/* Section list */}
        <div className="lg:col-span-2 space-y-3">
          {sections.map((s, i) => (
            <Card key={s.id} className="p-4 flex items-center gap-4 hover:border-gold/40 transition-colors">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
              <div className="h-9 w-9 rounded-md bg-muted grid place-items-center text-xs font-semibold text-muted-foreground">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{s.label}</span>
                  {!s.visible && <span className="text-[10px] uppercase tracking-[0.12em] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">Hidden</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{s.desc}</div>
              </div>
              <button className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground" title="Toggle visibility">
                {s.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted text-muted-foreground" title="Configure">
                <Settings2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>

        {/* Live preview */}
        <Card className="p-5 lg:sticky lg:top-20 h-fit">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3">Desktop preview</div>
          <div className="rounded-lg border border-border overflow-hidden bg-background">
            <div className="h-6 bg-muted flex items-center gap-1 px-2">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive/60" />
              <span className="h-1.5 w-1.5 rounded-full bg-warning/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-success/70" />
            </div>
            <div className="p-3 space-y-2">
              <div className="h-20 rounded-md gold-gradient grid place-items-center font-display text-navy text-sm">Hero · Aabharan</div>
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-sm bg-muted grid place-items-center text-[8px] text-muted-foreground">SP {i + 1}</div>
                ))}
              </div>
              <div className="h-10 rounded-md bg-muted grid place-items-center text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Categories Grid</div>
              <div className="h-10 rounded-md bg-muted grid place-items-center text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Nearby Stores</div>
              <div className="h-14 rounded-md bg-navy text-ivory grid place-items-center text-[9px] uppercase tracking-[0.12em]">Footer</div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Last published 2 hours ago by Arjun Nair.</p>
        </Card>
      </div>
    </>
  );
}
