import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Modal({
  open, onClose, title, description, children, footer, size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;
  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button aria-label="Close" onClick={onClose} className="fixed inset-0 bg-navy/45 backdrop-blur-[2px] animate-in fade-in" />
      <div className={`relative w-full ${width} my-auto rounded-2xl border border-border bg-card shadow-elevated animate-in fade-in zoom-in-95`}>
        <div className="flex items-start gap-4 px-6 pt-6">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl text-foreground">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = "Delete", destructive = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium">Cancel</button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`h-10 px-4 rounded-lg text-sm font-medium hover:opacity-95 ${destructive ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </Modal>
  );
}
