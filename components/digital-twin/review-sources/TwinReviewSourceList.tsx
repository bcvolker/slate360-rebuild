"use client";

import { FilePlus2 } from "lucide-react";
import type { TwinReviewSource } from "@/lib/digital-twin/review-source-types";
import type { TwinSourceChip } from "@/lib/digital-twin/twin-source-chip";
import { TwinReviewSourceRow } from "./TwinReviewSourceRow";

type Props = {
  sources: TwinReviewSource[];
  onChipChange: (sourceId: string, chip: TwinSourceChip) => void;
  onRemove: (sourceId: string) => void;
  disabled?: boolean;
};

export function TwinReviewSourceList({ sources, onChipChange, onRemove, disabled = false }: Props) {
  return (
    <section
      className="rounded-xl border border-white/10 bg-white/[0.04] px-4"
      aria-labelledby="twin-review-sources-heading"
      data-twin-review="sources"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
            Collected sources
          </p>
          <h2 id="twin-review-sources-heading" className="mt-1 text-base font-semibold text-[var(--graphite-text-header)]">
            {sources.length ? `${sources.length} source${sources.length === 1 ? "" : "s"}` : "No sources yet"}
          </h2>
        </div>
        <FilePlus2 className="h-5 w-5 text-[var(--graphite-muted)]" aria-hidden="true" />
      </div>

      {sources.length ? (
        <ul>
          {sources.map((source) => (
            <TwinReviewSourceRow
              key={source.id}
              source={source}
              disabled={disabled}
              onChipChange={(chip) => onChipChange(source.id, chip)}
              onRemove={source.origin === "capture" || source.assetId ? undefined : () => onRemove(source.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-[var(--graphite-muted)]">
          Add a photo, clip, or scan to begin.
        </p>
      )}
    </section>
  );
}
