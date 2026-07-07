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
      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">{title}</span>
        <span className="block truncate text-xs text-[var(--graphite-muted)]">{meta}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
    </Link>
  );
}
