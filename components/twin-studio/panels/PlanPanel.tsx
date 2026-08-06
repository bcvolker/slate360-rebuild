import { Ruler } from "lucide-react";

/** F3 (not yet built): wire floorplan.py + openings.py into the export stage, render areas. */
export function PlanPanel() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <Ruler className="size-6 text-[var(--graphite-muted)]" aria-hidden />
      <p className="text-sm font-medium text-zinc-200">Plan — coming in Phase F3</p>
      <p className="max-w-sm text-xs text-[var(--graphite-muted)]">
        Will wire the pipeline's dormant floorplan.py/openings.py into the export stage and render
        floor plan, floor sqft, and gross/net wall areas here — with a locked disclaimer, and
        wall-area-minus-openings numbers held back until validated against a tape measure on real
        captures.
      </p>
    </div>
  );
}
