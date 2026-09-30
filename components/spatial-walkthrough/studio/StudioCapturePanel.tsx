"use client";

import { captureMetaLabel, parseCaptureMeta, REEXPORT_NOTE } from "@/lib/spatial-walkthrough/capture-meta";

const INSTASTUDIO =
  "Insta360 Studio: File → Export. Full 2:1 equirectangular. FlowState ON. Horizon Lock ON. No reframe or crop. Fixed white balance. Replace this master, then bake CLIENT/PUBLIC.";

export function StudioCapturePanel({ captureMeta, duration, clipId }: { captureMeta: unknown; duration: number; clipId: string }) {
  const meta = parseCaptureMeta(captureMeta);
  return (
    <div className="space-y-3" data-testid="sw-capture-panel">
      <p className="text-sm text-white">Capture</p>
      <p className="text-xs leading-relaxed text-[var(--graphite-text-body)]">{captureMetaLabel(meta)}</p>
      <p className="text-xs text-[var(--graphite-muted)]">Clip {clipId.slice(0, 8)} · {Math.round(duration)}s</p>
      {meta.reexportRequired ? (
        <div className="border border-white/15 p-3 text-sm leading-relaxed text-[var(--graphite-text-body)]">
          <p className="mb-2 text-white">Presentation source requires horizon-corrected export</p>
          <p>{REEXPORT_NOTE}</p>
          <p className="mt-2">{INSTASTUDIO}</p>
        </div>
      ) : null}
    </div>
  );
}
