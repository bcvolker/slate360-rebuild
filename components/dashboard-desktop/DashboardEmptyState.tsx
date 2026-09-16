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
        "rounded-2xl border-2 border-dashed border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] px-6 py-10 text-center",
        className,
      )}
    >
      <p className="text-base font-semibold text-[var(--mkt-ink)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--mkt-ink-muted)]">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--mkt-accent-line)] bg-[var(--mkt-accent-soft)] px-4 text-sm font-semibold text-[var(--mkt-accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--mkt-accent)_16%,transparent)]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
