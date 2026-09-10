"use client";

import { useEffect, useState } from "react";
import { Box, Maximize2, X } from "lucide-react";

/**
 * Panel copy is deliberately generic — one real, permissioned example will
 * eventually sit here (not a per-visitor "your project" experience), so the
 * text must never imply every visitor's own project shows up on the
 * homepage. When a real example ships, swap this for it following the
 * HOME_EXAMPLES pattern (home-examples-light.tsx) rather than editing this
 * placeholder in place.
 */
function ViewerPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mkt-accent-soft)] ring-1 ring-[var(--mkt-accent-line)]">
        <Box className="h-5 w-5 text-[var(--mkt-accent)]" aria-hidden />
      </div>
      <div>
        <p className="font-serif text-lg font-normal text-[var(--mkt-ink)] sm:text-xl">An interactive project record</p>
        <p className="mx-auto mt-1.5 max-w-[34ch] text-[13.5px] leading-relaxed text-[var(--mkt-ink-muted)]">
          Once a site visit is complete, an interactive record — a walkthrough, a 360° tour, or a video —
          appears right here, for your team and anyone you choose to share it with.
        </p>
      </div>
    </div>
  );
}

/**
 * Deliberate viewer-shaped placeholder for the hero's right column — a
 * reversal of the earlier "no empty viewer chrome" rule, per Brian's
 * explicit request: a dashed-outline box so the space reads as "something
 * is coming" rather than a layout bug, expandable so he can show a prospect
 * what the eventual interactive experience will feel like. Swap
 * ViewerPlaceholder for a real embed once a permissioned example exists.
 */
export function HeroViewerPanel() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [expanded]);

  return (
    <>
      <div className="relative w-full">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-dashed border-[var(--mkt-accent-line)] bg-[var(--mkt-canvas-alt)] sm:aspect-video lg:aspect-[4/3]">
          <ViewerPlaceholder />
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Preview the viewer at full size"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--mkt-line)] bg-[var(--mkt-surface)]/90 text-[var(--mkt-ink-muted)] backdrop-blur-sm transition-colors hover:text-[var(--mkt-ink)]"
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {expanded ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--mkt-ink)]/40 p-4 backdrop-blur-sm sm:p-8"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)", paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1rem)" }}
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative flex h-full max-h-[640px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 border-dashed border-[var(--mkt-accent-line)] bg-[var(--mkt-surface)] shadow-2xl landscape:max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close preview"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--mkt-line)] bg-[var(--mkt-surface)] text-[var(--mkt-ink-muted)] transition-colors hover:text-[var(--mkt-ink)]"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex-1">
              <ViewerPlaceholder />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
