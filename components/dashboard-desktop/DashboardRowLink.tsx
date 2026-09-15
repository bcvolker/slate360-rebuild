import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

export function DashboardRowLink({
  href,
  icon: Icon,
  title,
  meta,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)] px-3 py-2.5 transition-colors hover:border-[var(--mkt-accent-line)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--mkt-accent-soft)] text-[var(--mkt-accent)]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--mkt-ink)]">{title}</span>
        <span className="block truncate text-xs text-[var(--mkt-ink-muted)]">{meta}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--mkt-ink-muted)]" />
    </Link>
  );
}
