import Link from "next/link";
import { vnextExploreHref } from "@/lib/vnext/explore/build-explore-href";
import type { VnextExploreRepresentation, VnextExploreSourceSummary } from "@/lib/vnext/explore-types";

type Props = {
  basePath: string;
  representation: VnextExploreRepresentation;
  sources: VnextExploreSourceSummary[];
  activeSourceId: string | null;
  present: boolean;
};

/** Only rendered when a representation has more than one selectable source (photo, sheet, visit). */
export function VnextExploreSourcePicker({ basePath, representation, sources, activeSourceId, present }: Props) {
  if (sources.length <= 1) return null;

  return (
    <div
      className="flex flex-wrap gap-1.5 border-b border-[var(--vnext-line)] py-2"
      role="group"
      aria-label="Choose which one to view"
      data-vnext-source-picker="true"
    >
      {sources.map((source) => {
        const isActive = source.id === activeSourceId;
        return (
          <Link
            key={source.id}
            href={vnextExploreHref(basePath, { rep: representation, source: source.id, present })}
            aria-current={isActive ? "true" : undefined}
            data-vnext-source-option={source.id}
            className={`inline-flex min-h-[2.25rem] items-center gap-1.5 border px-3 text-[length:var(--vnext-meta)] no-underline ${
              isActive
                ? "border-[var(--vnext-accent)] bg-[var(--vnext-accent-soft)] text-[var(--vnext-ink)]"
                : "border-[var(--vnext-line)] text-[var(--vnext-ink-muted)]"
            }`}
          >
            <span className="truncate">{source.label}</span>
            {source.dateLabel ? <span className="text-[var(--vnext-ink-muted)]">· {source.dateLabel}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
