import Link from "next/link";
import { cn } from "@/lib/utils";

type DashboardEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

export function DashboardEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: DashboardEmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] px-6 py-10 text-center backdrop-blur-md",
        className,
      )}
    >
      <p className="text-base font-semibold text-[var(--graphite-text-header)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--graphite-muted)]">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--graphite-primary)_32%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] px-4 text-sm font-semibold text-[var(--graphite-text-header)] transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_48%,transparent)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
