import type { ReactNode } from "react";
import type { SponsorStatus } from "@/lib/mock-data";

export function StatusPill({ status }: { status: SponsorStatus | "paid" | "pending" | "refunded" | "restricted" }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    active:     { label: "Active",        cls: "bg-success/10 text-success border-success/20",        dot: "bg-success" },
    restricted: { label: "Restricted",    cls: "bg-warning/15 text-[oklch(0.45_0.12_70)] border-warning/30", dot: "bg-warning" },
    featured:   { label: "Featured",      cls: "bg-gold/15 text-[oklch(0.45_0.1_75)] border-gold/30", dot: "bg-gold" },
    expiring:   { label: "Expiring soon", cls: "bg-warning/15 text-[oklch(0.45_0.12_70)] border-warning/30", dot: "bg-warning" },
    expired:    { label: "Expired",       cls: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
    pending:    { label: "Pending",       cls: "bg-muted text-muted-foreground border-border",        dot: "bg-muted-foreground" },
    paid:       { label: "Paid",          cls: "bg-success/10 text-success border-success/20",        dot: "bg-success" },
    refunded:   { label: "Refunded",      cls: "bg-muted text-muted-foreground border-border",        dot: "bg-muted-foreground" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card shadow-soft ${className}`}>{children}</div>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <h2 className="font-display text-xl text-foreground">{title}</h2>
      {action}
    </div>
  );
}
