type DashboardDesktopTopBarProps = {
  userName: string;
};

export function DashboardDesktopTopBar({ userName }: DashboardDesktopTopBarProps) {
  const initial = (userName.trim()[0] ?? "U").toUpperCase();

  return (
    <header className="flex h-12 shrink-0 items-center justify-end border-b border-[var(--mobile-app-card-border)] px-5">
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-[var(--graphite-text-body)] sm:inline">{userName}</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] text-xs font-bold text-[var(--graphite-primary)]"
          aria-hidden
        >
          {initial}
        </span>
      </div>
    </header>
  );
}
