"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChapterRecord } from "@/lib/spatial-walkthrough/chapters";
import { chapterAtTime, clampToChapter, orderedChapters, waypointsInChapter, orderedWaypointsAll } from "@/lib/spatial-walkthrough/chapters";
import type { ClipEdgeRecord, ClipSummary } from "@/lib/spatial-walkthrough/clip-edges";
import { crossingKind, destTime, locationChip, nearClipEnd, outgoingEdge, resolveEdges } from "@/lib/spatial-walkthrough/clip-edges";
import { EMPTY_LOCATOR, type ShareLocator } from "@/lib/spatial-walkthrough/share-locator";
import type { WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { WalkthroughPlayerHandle } from "./WalkthroughPlayer";

type Args = {
  clips: ClipSummary[];
  chapters: ChapterRecord[];
  edges: ClipEdgeRecord[];
  waypoints: WaypointRecord[];
  walkthroughId?: string;
  locator?: ShareLocator;
  lockedChapterId?: string | null;
  player: WalkthroughPlayerHandle | null;
  preview?: boolean;
  authoring?: boolean;
};

export function useChapterSession({
  clips,
  chapters,
  edges,
  waypoints,
  walkthroughId = "",
  locator = EMPTY_LOCATOR,
  lockedChapterId = null,
  player,
  preview = false,
  authoring = false,
}: Args) {
  const ordered = useMemo(() => [...clips].sort((a, b) => a.sortOrder - b.sortOrder), [clips]);
  const visibleChapters = useMemo(() => orderedChapters(chapters), [chapters]);
  const graph = useMemo(() => resolveEdges(ordered, edges, walkthroughId), [clips, edges, walkthroughId, ordered]);

  const locked = lockedChapterId ? visibleChapters.find((c) => c.id === lockedChapterId) ?? null : null;
  const initialChapter = locator.chapterId
    ? visibleChapters.find((c) => c.id === locator.chapterId) ?? locked
    : locked;
  const initialClip = locator.clipId
    ? ordered.find((c) => c.id === locator.clipId)
    : initialChapter
      ? ordered.find((c) => c.id === initialChapter.clipId)
      : ordered[0];

  const [clipId, setClipId] = useState(initialClip?.id ?? ordered[0]?.id ?? "");
  const [chapterId, setChapterId] = useState<string | null>(initialChapter?.id ?? null);
  const [currentT, setCurrentT] = useState(locator.tSeconds ?? initialChapter?.startTime ?? 0);
  const [fade, setFade] = useState<{ label: string; kind: string } | null>(null);
  const pending = useRef<{ t: number; yaw: number; pitch: number; pause: boolean } | null>(null);
  const appliedLocator = useRef(false);
  const crossed = useRef<string | null>(null);

  const activeClip = ordered.find((c) => c.id === clipId) ?? ordered[0] ?? null;
  const selectedChapter = chapterId ? visibleChapters.find((c) => c.id === chapterId) ?? null : null;
  const entireWalk = !selectedChapter && !locked;
  const liveChapter = chapterAtTime(visibleChapters, clipId, currentT);
  const duration = activeClip?.durationS ?? 0;

  const scopedWaypoints = useMemo(() => {
    if (selectedChapter) return waypointsInChapter(waypoints, selectedChapter);
    return orderedWaypointsAll(waypoints, ordered.map((c) => c.id));
  }, [waypoints, selectedChapter, ordered]);

  useEffect(() => {
    if (!player) return;
    const id = window.setInterval(() => {
      const view = player.getView();
      setCurrentT(view.t);
      if (selectedChapter && !authoring && view.t > selectedChapter.endTime + 0.04) {
        player.pause();
        player.seekTo(clampToChapter(view.t, selectedChapter), selectedChapter.defaultYaw, selectedChapter.defaultPitch);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [player, selectedChapter, authoring]);

  useEffect(() => {
    if (!player || appliedLocator.current) return;
    appliedLocator.current = true;
    const chapter = initialChapter;
    const t = locator.tSeconds ?? chapter?.startTime ?? 0;
    const yaw = locator.yawDeg ?? chapter?.defaultYaw ?? activeClip?.defaultYaw ?? 0;
    const pitch = locator.pitchDeg ?? chapter?.defaultPitch ?? activeClip?.defaultPitch ?? 0;
    player.seekTo(t, yaw, pitch);
    if (chapter || locator.tSeconds != null) player.pause();
  }, [player, initialChapter, locator, activeClip]);

  useEffect(() => {
    if (!player || !pending.current) return;
    const next = pending.current;
    pending.current = null;
    player.seekTo(next.t, next.yaw, next.pitch);
    if (next.pause) player.pause();
    window.setTimeout(() => setFade(null), 480);
  }, [player, clipId]);

  useEffect(() => {
    if (!entireWalk || authoring || preview || !activeClip) return;
    if (!nearClipEnd(currentT, duration)) return;
    const edge = outgoingEdge(graph, clipId, "end");
    if (!edge || crossed.current === clipId) return;
    const dest = ordered.find((c) => c.id === edge.destClipId);
    if (!dest) return;
    crossed.current = clipId;
    goClip(dest, destTime(edge, dest.durationS), edge.defaultYaw, edge.defaultPitch, false, locationChip(dest, edge.transitionType), edge.transitionType);
  }, [currentT, duration, entireWalk, authoring, preview, activeClip, graph, clipId, ordered]);

  function goClip(
    dest: ClipSummary,
    t: number,
    yaw: number,
    pitch: number,
    pause: boolean,
    label: string,
    kind: string,
  ) {
    if (crossingKind(clipId, dest.id) === "continue") {
      player?.seekTo(t, yaw, pitch);
      if (pause) player?.pause();
      setCurrentT(t);
      return;
    }
    setFade({ label, kind });
    pending.current = { t, yaw, pitch, pause };
    setClipId(dest.id);
    setCurrentT(t);
  }

  function selectChapter(nextId: string | null) {
    if (locked && nextId !== locked.id) return;
    if (!nextId) {
      setChapterId(null);
      const first = ordered[0];
      if (first && first.id !== clipId) {
        goClip(first, 0, first.defaultYaw, first.defaultPitch, true, first.title ?? "Entire Walk", "manual");
      } else {
        player?.seekTo(0, first?.defaultYaw ?? 0, first?.defaultPitch ?? 0);
        player?.pause();
        setCurrentT(0);
      }
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/w/")) {
        const url = new URL(window.location.href);
        url.searchParams.delete("chapter");
        window.history.replaceState(null, "", `${url.pathname}${url.search}`);
      }
      return;
    }
    const chapter = visibleChapters.find((c) => c.id === nextId);
    if (!chapter) return;
    setChapterId(chapter.id);
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/w/")) {
      const url = new URL(window.location.href);
      url.searchParams.set("chapter", chapter.id);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
    const dest = ordered.find((c) => c.id === chapter.clipId);
    if (!dest) return;
    if (dest.id === clipId) {
      player?.seekTo(chapter.startTime, chapter.defaultYaw, chapter.defaultPitch);
      player?.pause();
      setCurrentT(chapter.startTime);
      return;
    }
    goClip(dest, chapter.startTime, chapter.defaultYaw, chapter.defaultPitch, true, chapter.name, "manual");
  }

  function goWaypoint(wp: WaypointRecord) {
    const dest = ordered.find((c) => c.id === wp.clipId);
    if (!dest) return;
    if (dest.id === clipId) {
      player?.seekTo(wp.tSeconds, wp.yawDeg, wp.pitchDeg);
      return;
    }
    goClip(dest, wp.tSeconds, wp.yawDeg, wp.pitchDeg, true, dest.title ?? dest.zone ?? "Next capture", "manual");
  }

  return {
    clipId,
    activeClip,
    selectedChapter,
    liveChapter,
    entireWalk,
    currentT,
    duration,
    scopedWaypoints,
    fade,
    chapters: locked ? visibleChapters.filter((c) => c.id === locked.id) : visibleChapters,
    pickerLocked: Boolean(locked),
    selectChapter,
    goWaypoint,
    setCurrentT,
  };
}
