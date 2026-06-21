"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useEditorStore, clipAt, layoutClips, type ClipLayout } from "./editor-store";

/**
 * Double-buffered playback engine: two <video> elements. One is active (showing /
 * playing); the other silently preloads the NEXT clip seeked to its in-point. At a
 * clip boundary we swap to the already-loaded buffer (seamless — no load hitch),
 * then preload the following clip into the freed buffer. Playhead is driven by the
 * active video's `timeupdate` (background-safe) plus rAF for smoothness.
 */
export function usePlayback(aRef: RefObject<HTMLVideoElement | null>, bRef: RefObject<HTMLVideoElement | null>) {
  const playing = useEditorStore((s) => s.playing);
  const clips = useEditorStore((s) => s.clips);
  const playheadSec = useEditorStore((s) => s.playheadSec);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef(0);
  const slotClip = useRef<[string | null, string | null]>([null, null]);
  const rafRef = useRef<number | null>(null);
  const probing = useRef<Set<string>>(new Set());

  const video = (i: number) => (i === 0 ? aRef.current : bRef.current);

  // Probe duration for clips with unknown length so they lay out + can play.
  useEffect(() => {
    for (const c of clips) {
      if ((c.durationSec || 0) > 0 || probing.current.has(c.id)) continue;
      probing.current.add(c.id);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = c.src;
      v.addEventListener("loadedmetadata", () => {
        if (isFinite(v.duration) && v.duration > 0) useEditorStore.getState().patchClipDuration(c.id, v.duration);
        probing.current.delete(c.id);
        v.src = "";
      }, { once: true });
      v.addEventListener("error", () => probing.current.delete(c.id), { once: true });
    }
  }, [clips]);

  // Load a clip into a buffer at a position; optionally start playing it.
  function load(i: number, clip: ClipLayout["clip"], seekTo: number, play: boolean) {
    const v = video(i);
    if (!v || !clip) return;
    try { v.playbackRate = Math.max(0.25, Math.min(4, clip.speedFactor || 1)); } catch { /* ignore */ }
    v.muted = !!clip.muted; // embedded audio detached → play it from the audio lane instead
    if (slotClip.current[i] !== clip.id) {
      slotClip.current[i] = clip.id;
      v.preload = "auto";
      if (!v.currentSrc.endsWith(clip.src)) v.src = clip.src;
      const go = () => {
        try { v.currentTime = seekTo; } catch { /* ignore */ }
        if (play) v.play().catch(() => {});
      };
      if (v.readyState >= 1) go();
      else v.addEventListener("loadedmetadata", go, { once: true });
    } else {
      if (Math.abs(v.currentTime - seekTo) > 0.1) { try { v.currentTime = seekTo; } catch { /* ignore */ } }
      if (play) v.play().catch(() => {}); else v.pause();
    }
  }

  // Preload the clip AFTER `activeRow` into the inactive buffer (paused, at in-point).
  function preloadNext(rows: ClipLayout[], activeRow: ClipLayout | undefined) {
    if (!activeRow) return;
    const nextStart = activeRow.startSec + activeRow.lengthSec;
    const next = rows.find((r) => r.startSec >= nextStart - 0.001 && r.clip.id !== activeRow.clip.id);
    const other = activeRef.current === 0 ? 1 : 0;
    if (next) load(other, next.clip, next.clip.trimInSec, false);
  }

  // SCRUB / seek (paused): show the active clip's frame, preload the next.
  useEffect(() => {
    if (playing) return;
    const active = clipAt(clips, playheadSec);
    if (!active) return;
    load(activeRef.current, active.row.clip, active.localSec, false);
    const { rows } = layoutClips(clips);
    preloadNext(rows, active.row);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, clips, playheadSec]);

  // PLAYBACK: drive playhead, swap buffers seamlessly at boundaries.
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      aRef.current?.pause();
      bRef.current?.pause();
      return;
    }
    const st = useEditorStore.getState();
    const start = clipAt(st.clips, st.playheadSec) ?? clipAt(st.clips, 0);
    if (!start) { useEditorStore.getState().pause(); return; }
    load(activeRef.current, start.row.clip, start.localSec, true);
    preloadNext(layoutClips(st.clips).rows, start.row);

    const sync = () => {
      const s = useEditorStore.getState();
      const { rows, total } = layoutClips(s.clips);
      const v = video(activeRef.current);
      const row = rows.find((r) => r.clip.id === slotClip.current[activeRef.current]);
      if (!v || !row) return;
      const end = row.clip.trimOutSec || row.clip.durationSec || v.duration || 0;
      if (end > 0 && v.currentTime >= end - 0.05) {
        const nextStart = row.startSec + row.lengthSec;
        const next = rows.find((r) => r.startSec >= nextStart - 0.001 && r.clip.id !== row.clip.id);
        if (next && nextStart < total - 0.01) {
          v.pause();
          const other = activeRef.current === 0 ? 1 : 0;
          activeRef.current = other;
          setActiveIndex(other);
          load(other, next.clip, next.clip.trimInSec, true); // already preloaded → instant
          s.setPlayhead(nextStart + 0.001);
          preloadNext(rows, next);
        } else {
          s.setPlayhead(total);
          s.pause();
        }
      } else {
        s.setPlayhead(row.startSec + (v.currentTime - row.clip.trimInSec) / (row.clip.speedFactor || 1));
      }
    };

    // Bind to BOTH buffers so the active one always drives the playhead after a swap.
    aRef.current?.addEventListener("timeupdate", sync);
    bRef.current?.addEventListener("timeupdate", sync);
    const raf = () => { sync(); rafRef.current = requestAnimationFrame(raf); };
    rafRef.current = requestAnimationFrame(raf);
    return () => {
      aRef.current?.removeEventListener("timeupdate", sync);
      bRef.current?.removeEventListener("timeupdate", sync);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, aRef, bRef]);

  return { activeIndex };
}
