"use client";

import { useEffect, useRef, useState } from "react";
import { WalkthroughPlayer, type WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { formatClock } from "@/lib/spatial-tour/format";
import type { TourClip } from "@/lib/spatial-tour/types";
import type { TourUrls } from "@/lib/spatial-tour/urls";

const nudge =
  "inline-flex h-9 items-center rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 text-xs font-semibold text-[var(--graphite-text-body)]";

export type PlayerView = { clipId: string; t: number; yaw: number; pitch: number };

/**
 * The operator marks checkpoints on the clip's PUBLIC (operator-free) proxy: the same
 * timeline clients play and the same file stills are cut from.
 */
export function TourMarkPlayer({
  walkthroughId,
  clips,
  seekRequest,
  onView,
  urls,
}: {
  walkthroughId: string;
  urls: TourUrls;
  clips: TourClip[];
  /** Jump here when it changes (e.g. the operator clicked a checkpoint). */
  seekRequest: PlayerView | null;
  onView: (view: PlayerView | null) => void;
}) {
  const playable = clips.filter((c) => c.hasPublicProxy);
  const [clipId, setClipId] = useState(playable[0]?.id ?? "");
  const [handle, setHandle] = useState<WalkthroughPlayerHandle | null>(null);
  // Marking needs a decoded frame, not just a mounted player.
  const [hasFrame, setHasFrame] = useState(false);
  const [now, setNow] = useState(0);
  const pendingSeek = useRef<PlayerView | null>(null);
  const clip = playable.find((c) => c.id === clipId) ?? playable[0];
  const duration = clip?.durationS ?? 0;

  useEffect(() => {
    if (!seekRequest) return;
    if (seekRequest.clipId !== clipId) {
      pendingSeek.current = seekRequest;
      setHandle(null);
      setHasFrame(false);
      setClipId(seekRequest.clipId);
    } else {
      handle?.seekTo(seekRequest.t, seekRequest.yaw, seekRequest.pitch, { pause: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekRequest]);

  useEffect(() => {
    if (!handle || !hasFrame) {
      onView(null);
      return;
    }
    const pending = pendingSeek.current;
    if (pending && pending.clipId === clipId) {
      handle.seekTo(pending.t, pending.yaw, pending.pitch, { pause: true });
      pendingSeek.current = null;
    }
    const id = window.setInterval(() => {
      const v = handle.getView();
      setNow(v.t);
      onView({ clipId, t: v.t, yaw: v.yaw, pitch: v.pitch });
    }, 250);
    return () => window.clearInterval(id);
  }, [handle, hasFrame, clipId, onView]);

  if (!clip) {
    return (
      <div className={t.sectionCard}>
        <p className="text-sm text-[var(--graphite-muted)]">
          This visit has no operator-free video yet. Run the privacy bake in the walkthrough studio, then come back to mark it.
        </p>
      </div>
    );
  }

  const seek = (next: number) => handle?.seekTo(Math.min(Math.max(next, 0), duration || next), undefined, undefined, { pause: true });

  return (
    <div className="space-y-2 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-2 lg:space-y-0" data-testid="tour-mark-player">
      {/* Desktop: the player takes the pane's remaining height (no blank space below it). */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] lg:aspect-auto lg:min-h-[240px] lg:flex-1">
        <WalkthroughPlayer
          key={clip.id}
          videoUrl={urls.media(walkthroughId, clip.id, "proxy")}
          posterUrl={urls.media(walkthroughId, clip.id, "poster")}
          waypoints={[]}
          clipId={clip.id}
          autoRotate={false}
          onReady={setHandle}
          onFirstFrame={() => setHasFrame(true)}
        />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={nudge} onClick={() => seek(now - 1)} aria-label="Back one second">
          −1s
        </button>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(now, duration || now)}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-9 flex-1 accent-[var(--graphite-primary)]"
          aria-label="Scrub the visit"
          data-testid="tour-scrub"
        />
        <button type="button" className={nudge} onClick={() => seek(now + 1)} aria-label="Forward one second">
          +1s
        </button>
        <span className="w-20 text-right font-mono text-xs tabular-nums text-[var(--graphite-muted)]">
          {formatClock(now)} / {formatClock(duration)}
        </span>
      </div>
      {playable.length > 1 ? (
        <select
          className="min-h-11 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-transparent px-3 text-sm text-[var(--graphite-text-header)]"
          value={clip.id}
          onChange={(e) => {
            setHandle(null);
            setHasFrame(false);
            setClipId(e.target.value);
          }}
          aria-label="Clip"
        >
          {playable.map((c, i) => (
            <option key={c.id} value={c.id}>
              Clip {i + 1} · {formatClock(c.durationS)}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
