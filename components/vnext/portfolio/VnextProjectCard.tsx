import Link from "next/link";
import { VnextProjectHero } from "@/components/vnext/portfolio/VnextProjectHero";
import { REPRESENTATION_LABEL } from "@/lib/vnext/project-hero";
import type { PortfolioRecord } from "@/lib/vnext/portfolio-types";

type Props = {
  project: PortfolioRecord;
};

export function VnextProjectCard({ project }: Props) {
  const representations = project.representations.map((id) => REPRESENTATION_LABEL[id]).join(" · ");

  return (
    <Link
      href={project.href}
      className="block min-w-0 text-[var(--vnext-ink)] no-underline"
      data-vnext-project-card={project.id}
    >
      <VnextProjectHero hero={project.hero} />
      <div className="pt-3">
        <h2 className="m-0 line-clamp-2 text-[1.05rem] font-semibold tracking-tight">{project.name}</h2>
        {project.context ? (
          <p className="mt-1 mb-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">
            {project.context}
          </p>
        ) : null}
        {project.locationLabel ? (
          <p className="mt-0.5 mb-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
            {project.locationLabel}
          </p>
        ) : null}
        {project.documentedLabel ? (
          <p className="mt-1 mb-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
            {project.documentedLabel}
          </p>
        ) : null}
        {representations ? (
          <p className="mt-2 mb-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
            {representations}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
