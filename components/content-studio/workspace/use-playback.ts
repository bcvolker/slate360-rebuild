"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useEditorStore, clipAt, layoutClips } from "./editor-store";

/**
 * Drives a single <video> from the editor store: scrubbing when paused (seek the
 * active clip's proxy), sequential playback when playing (advance to the next clip
 * at each boundary). Boundary swaps have a small load hitch in V1 — a 2-element
 * preload pool is a later optimization; this is enough to test playback + scrub.
 */
export function usePlayback(videoRef: RefObject<HTMLVideoElement | null>) {
  const playing = useEditorStore((s) => s.playing);
  const clips = useEditorStore((s) => s.clips);
  const playheadSec = useEditorStore((s) => s.playheadSec);
  const loadedClipId = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const probing = useRef<Set<string>>(new Set());

  // Probe duration for any clip whose length is still unknown (mock mode / fresh add),
  // so the timeline can lay it out and playback can reach it.
  useEffect(() => {
    for (const c of clips) {
      if ((c.durationSec || 0) > 0 || probing.current.has(c.id)) continue;
      probing.current.add(c.id);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = c.src;
      v.addEventListener(
        "loadedmetadata",
        () => {
          if (isFinite(v.duration) && v.duration > 0) {
            useEditorStore.getState().patchClipDuration(c.id, v.duration);
          }
          probing.current.delete(c.id);
          v.src = "";
        },
        { once: true },
      );
      v.addEventListener("error", () => probing.current.delete(c.id), { once: true });
    }
  }, [clips]);

  // SCRUB / seek ownership (paused): keep the right source frame under the playhead.
  useEffect(() => {
    if (playing) return;
    const video = videoRef.current;
    if (!video) return;
    const active = clipAt(clips, playheadSec);
    if (!active) return;
    const clip = active.row.clip;
    const applySeek = () => {
      if ((clip.durationSec || 0) === 0 && isFinite(video.duration) && video.duration > 0) {
        useEditorStore.getState().patchClipDuration(clip.id, video.duration);
      }
      try {
        if (Math.abs(video.currentTime - active.localSec) > 0.04) video.currentTime = active.localSec;
      } catch {
        /* not seekable yet */
      }
    };
    if (loadedClipId.current !== clip.id) {
      loadedClipId.current = clip.id;
      video.src = clip.src;
      video.addEventListener("loadedmetadata", applySeek, { once: true });
    } else {
      applySeek();
    }
  }, [playing, clips, playheadSec, videoRef]);

  // PLAYBACK ownership. Playhead is driven by the video's `timeupdate` (reliable
  // even when the tab is backgrounded) plus a rAF for smoother motion when visible.
  // Boundary crossings advance to the next clip; reaching the end stops playback.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      video?.pause();
      return;
    }

    const loadAndPlay = (clipId: string, src: string, seekTo: number) => {
      loadedClipId.current = clipId;
      if (video.src !== src && !video.currentSrc.endsWith(src)) video.src = src;
      const go = () => {
        try {
          video.currentTime = seekTo;
        } catch {
          /* ignore */
        }
        video.play().catch(() => {});
      };
      if (video.readyState >= 1) go();
      else video.addEventListener("loadedmetadata", go, { once: true });
    };

    const start = clipAt(useEditorStore.getState().clips, useEditorStore.getState().playheadSec)
      ?? clipAt(useEditorStore.getState().clips, 0);
    if (!start) {
      useEditorStore.getState().pause();
      return;
    }
    if (loadedClipId.current !== start.row.clip.id) {
      loadAndPlay(start.row.clip.id, start.row.clip.src, start.localSec);
    } else {
      // Same clip already loaded — resume from the (possibly scrubbed) playhead.
      if (Math.abs(video.currentTime - start.localSec) > 0.1) {
        try {
          video.currentTime = start.localSec;
        } catch {
          /* ignore */
        }
      }
      video.play().catch(() => {});
    }

    const sync = () => {
      const s = useEditorStore.getState();
      const { rows, total } = layoutClips(s.clips);
      const row = rows.find((r) => r.clip.id === loadedClipId.current);
      if (!row) return;
      const clip = row.clip;
      const end = clip.trimOutSec || clip.durationSec || video.duration || 0;
      if (end > 0 && video.currentTime >= end - 0.05) {
        const nextStart = row.startSec + row.lengthSec;
        const next = rows.find((r) => r.startSec >= nextStart - 0.001 && r.clip.id !== clip.id);
        if (next && nextStart < total - 0.01) {
          s.setPlayhead(nextStart + 0.001);
          loadAndPlay(next.clip.id, next.clip.src, next.clip.trimInSec);
        } else {
          s.setPlayhead(total);
          s.pause();
        }
      } else {
        s.setPlayhead(row.startSec + (video.currentTime - clip.trimInSec));
      }
    };

    video.addEventListener("timeupdate", sync);
    const raf = () => {
      sync();
      rafRef.current = requestAnimationFrame(raf);
    };
    rafRef.current = requestAnimationFrame(raf);
    return () => {
      video.removeEventListener("timeupdate", sync);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, videoRef]);
}
