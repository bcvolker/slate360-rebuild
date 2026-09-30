"use client";

import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import type { NarrationSegment } from "@/lib/spatial-walkthrough/audio";
import { NarrationLane } from "@/components/spatial-walkthrough/audio/NarrationLane";

type Props = {
  walkthroughId: string;
  clipId: string;
  duration: number;
  currentT: number;
  segments: NarrationSegment[];
  onRefresh: () => void;
  onDrag: (id: string, deltaS: number) => void;
};

export function NarrationAuthorPanel({ walkthroughId, clipId, duration, currentT, segments, onRefresh, onDrag }: Props) {
  const rec = useAudioRecorder();
  const post = async (file: Blob, source: "record" | "upload") => {
    const body = new FormData();
    body.set("clipId", clipId);
    body.set("startTime", String(currentT));
    body.set("endTime", String(Math.min(duration || currentT + 12, currentT + Math.max(1, rec.durationMs / 1000 || 8))));
    body.set("title", "Narration");
    body.set("speaker", "Guide");
    body.set("source", source);
    body.set("file", file, source === "record" ? "narration.webm" : "narration.audio");
    await fetch(`/api/spatial-walkthrough/${walkthroughId}/narration`, { method: "POST", body });
    onRefresh();
  };

  return (
    <section className="space-y-3 border border-white/10 bg-white/[0.04] p-4" data-testid="sw-narration-author">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Guided narration</p>
      <p className="text-sm text-[var(--graphite-muted)]">Separate from camera audio. Master 360 is never modified.</p>
      <NarrationLane segments={segments} clipId={clipId} duration={duration} activeId={null} authoring onDrag={onDrag} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-4 text-[var(--graphite-primary)]"
          onClick={() => (rec.isRecording ? void rec.stop().then((b) => b && post(b, "record")) : void rec.start())}
        >
          {rec.isRecording ? "Stop & place" : "Record at playhead"}
        </button>
        <label className="inline-flex h-11 cursor-pointer items-center border border-white/10 px-3 text-sm">
          Upload
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void post(file, "upload");
            }}
          />
        </label>
      </div>
      <ul className="space-y-1 text-sm">
        {segments.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span>{s.title ?? "Narration"} · {s.startTime.toFixed(1)}–{s.endTime.toFixed(1)}s · {s.speaker ?? "—"}</span>
            <span className="flex gap-2">
              <button
                type="button"
                className="text-[var(--graphite-primary)]"
                onClick={() => {
                  const start = Number(prompt("Start (s)", String(s.startTime)));
                  const end = Number(prompt("End (s)", String(s.endTime)));
                  if (!Number.isFinite(start) || !Number.isFinite(end)) return;
                  void fetch(`/api/spatial-walkthrough/${walkthroughId}/narration/${s.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ startTime: start, endTime: end }),
                  }).then(onRefresh);
                }}
              >
                Trim
              </button>
              <button
                type="button"
                className="text-[var(--graphite-primary)]"
                onClick={() => {
                  void fetch(`/api/spatial-walkthrough/${walkthroughId}/narration/${s.id}`, { method: "DELETE" }).then(onRefresh);
                }}
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
