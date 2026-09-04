import { useEffect, useRef, useState, type ReactNode } from "react";

/** Lightweight click-outside dropdown used for row actions. */
export function Menu({ trigger, children, align = "right" }: {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="contents">{trigger}</button>
      {open && (
        <div className={`absolute top-full mt-1.5 z-40 min-w-[190px] rounded-lg border border-border bg-card shadow-elevated py-1 animate-in fade-in zoom-in-95 ${align === "right" ? "right-0" : "left-0"}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ children, onClick, danger }: {
  children: ReactNode; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
        danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
