import Link from "next/link";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";

type ProjectDetailEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function ProjectDetailEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: ProjectDetailEmptyStateProps) {
  return (
    <div className={`px-6 py-10 text-center ${t.sectionCard}`}>
      <h3 className="text-base font-semibold text-[var(--graphite-text-header)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--graphite-muted)]">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className={`${t.primaryButton} mt-5`}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
