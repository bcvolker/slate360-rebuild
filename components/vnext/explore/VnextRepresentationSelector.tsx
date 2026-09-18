import Link from "next/link";
import { REPRESENTATION_LABEL } from "@/lib/vnext/project-hero";
import { vnextExploreHref } from "@/lib/vnext/explore/build-explore-href";
import type { VnextExploreRepresentation } from "@/lib/vnext/explore-types";

type Props = {
  basePath: string;
  available: VnextExploreRepresentation[];
  active: VnextExploreRepresentation | null;
  present: boolean;
};

/**
 * A restrained row of choices, not an app-launcher grid — only representations with proven,
 * renderable data ever appear (no Drone, no "Coming soon").
 */
export function VnextRepresentationSelector({ basePath, available, active, present }: Props) {
  if (available.length <= 1) return null;

  return (
    <nav
      aria-label="Representation"
      className="flex flex-wrap gap-1 border-b border-[var(--vnext-line)]"
      data-vnext-rep-selector="true"
    >
      {available.map((rep) => {
        const isActive = rep === active;
        return (
          <Link
            key={rep}
            href={vnextExploreHref(basePath, { rep, source: null, present })}
            aria-current={isActive ? "true" : undefined}
            data-vnext-rep-option={rep}
            className={`flex min-h-[var(--vnext-touch)] items-center border-b-2 px-4 text-[length:var(--vnext-body)] no-underline ${
              isActive
                ? "border-[var(--vnext-accent)] font-medium text-[var(--vnext-ink)]"
                : "border-transparent text-[var(--vnext-ink-muted)]"
            }`}
          >
            {REPRESENTATION_LABEL[rep]}
          </Link>
        );
      })}
    </nav>
  );
}
