// components/admin/topbar.tsx

export function AdminTopbar({ title, subtitle, actions }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center gap-4 px-6 lg:px-10 h-16">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground -mt-0.5">{subtitle}</p>}
        </div>

        {actions && (
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}