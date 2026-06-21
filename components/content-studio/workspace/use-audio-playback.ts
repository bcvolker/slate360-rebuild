"use client";

import { useEffect, type RefObject } from "react";
import { useEditorStore } from "./editor-store";

/**
 * Audio-lane playback: slaves each audio-overlay <audio> element (rendered by the
 * Preview, refs passed in) to the master clock (playheadSec + playing), applying
 * per-item gain and linear fade-in/out to its volume. Detached-clip audio and,
 * later, imported music both flow through here.
 */
export function useAudioPlayback(refs: RefObject<Map<string, HTMLAudioElement>>) {
  const overlayItems = useEditorStore((s) => s.overlayItems);
  const playing = useEditorStore((s) => s.playing);
  const playheadSec = useEditorStore((s) => s.playheadSec);

  useEffect(() => {
    const items = overlayItems.filter((o) => o.lane === "audio" && o.src);
    for (const it of items) {
      const a = refs.current?.get(it.id);
      if (!a) continue;
      const local = playheadSec - it.startSec;
      const within = local >= 0 && local < it.durationSec;

      // gain × linear fades
      let vol = it.audioGain ?? 1;
      const fi = it.fadeInSec ?? 0;
      const fo = it.fadeOutSec ?? 0;
      if (fi > 0 && local < fi) vol *= Math.max(0, local / fi);
      if (fo > 0 && local > it.durationSec - fo) vol *= Math.max(0, (it.durationSec - local) / fo);
      a.volume = Math.max(0, Math.min(1, vol));

      if (playing && within) {
        if (Math.abs(a.currentTime - local) > 0.3) { try { a.currentTime = Math.max(0, local); } catch { /* ignore */ } }
        if (a.paused) a.play().catch(() => {});
      } else {
        if (!a.paused) a.pause();
        if (!playing && within && Math.abs(a.currentTime - local) > 0.1) { try { a.currentTime = Math.max(0, local); } catch { /* ignore */ } }
      }
    }
  }, [overlayItems, playing, playheadSec, refs]);
}
