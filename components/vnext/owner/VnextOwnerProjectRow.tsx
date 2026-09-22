import Link from "next/link";
import { formatPlainDate } from "@/lib/vnext/overview-visit";
import type { OwnerProjectSummary } from "@/lib/vnext/owner/owner-types";

const link = "inline-flex min-h-11 items-center text-[length:var(--vnext-body)] text-[var(--vnext-ink)] no-underline";

export function VnextOwnerProjectRow({ project }: { project: OwnerProjectSummary }) {
  const context = [project.clientName, project.location].filter(Boolean).join(" · ");
  const date = formatPlainDate(project.documentedAt);
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--vnext-line)] py-3" data-vnext-owner-project={project.id}>
      <div className="flex min-w-0 gap-3">
        {project.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnailUrl} alt="" className="h-16 w-16 shrink-0 object-cover" />
        ) : null}
        <div className="min-w-0">
          <Link href={project.detailHref} className={`${link} font-semibold`}>
            {project.name}
          </Link>
          {context ? <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">{context}</p> : null}
          {project.includedLabel ? (
            <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]" data-vnext-included={project.id}>
              Included: {project.includedLabel}
            </p>
          ) : null}
          {project.visibleLabel ? (
            <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]" data-vnext-visible={project.id}>
              Client can see: {project.visibleLabel}
            </p>
          ) : null}
          {project.attentionTitle ? (
            <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]" data-vnext-project-attention={project.id}>
              {project.attentionTitle}
            </p>
          ) : null}
          {date ? <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">{date}</p> : null}
        </div>
      </div>
      <Link href={project.projectHref} className={`${link} border border-[var(--vnext-line)] px-3`}>
        Open project
      </Link>
    </li>
  );
}
