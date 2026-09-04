import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card } from "@/components/admin/ui-bits";
import { categories } from "@/lib/mock-data";
import { Plus, Tags, Pencil, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_admin/categories")({
  head: () => ({ meta: [{ title: "Categories · Aabharan Admin" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <>
      <AdminTopbar
        title="Categories"
        subtitle={`${categories.length} total · ${categories.filter((c) => c.active).length} active`}
        actions={
          <button className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95">
            <Plus className="h-4 w-4" /> New category
          </button>
        }
      />
      <div className="px-6 lg:px-10 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c) => (
            <Card key={c.id} className="p-5 group hover:shadow-elevated transition-shadow">
              <div className="flex items-start gap-3">
                <div className={`h-11 w-11 rounded-lg grid place-items-center ${c.active ? "bg-gold/15 text-[oklch(0.5_0.13_75)]" : "bg-muted text-muted-foreground"}`}>
                  <Tags className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-foreground truncate">{c.name}</div>
                    {!c.active && <EyeOff className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">/{c.slug}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{c.sponsors} sponsors</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="h-7 w-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground"><Eye className="h-3.5 w-3.5" /></button>
                  <button className="h-7 w-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
