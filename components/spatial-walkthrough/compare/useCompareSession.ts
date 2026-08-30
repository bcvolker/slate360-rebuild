"use client";

import { useMemo, useState } from "react";
import type { CompareAnchor } from "@/lib/spatial-walkthrough/compare-anchor";
import { datePairs, resolvePair, type DatePair } from "@/lib/spatial-walkthrough/compare-dates";
import { type CompareIssueRef } from "@/lib/spatial-walkthrough/compare-issue";
import { locatorFromView, type CompareLocator } from "@/lib/spatial-walkthrough/compare-locator";
import { matchCandidates, type MatchCandidate } from "@/lib/spatial-walkthrough/compare-match";
import { defaultMode, desktopModes, mobileModes, type CompareMode } from "@/lib/spatial-walkthrough/compare-mode";
import { overlayGate } from "@/lib/spatial-walkthrough/compare-overlay";
import { linkedLook, mapThroughAnchors } from "@/lib/spatial-walkthrough/compare-sync";
import {
  HALL_ANCHORS,
  HALL_AUG_CHAPTERS,
  HALL_AUG_CLIP,
  HALL_AUG_PINS,
  HALL_AUG_WAYPOINTS,
  HALL_CAPTURES,
  HALL_ISSUES,
  HALL_JUN_CHAPTERS,
  HALL_JUN_CLIP,
  HALL_JUN_PINS,
  HALL_JUN_WAYPOINTS,
  HALL_PROJECT_ID,
} from "@/lib/spatial-walkthrough/compare-preview-fixtures";

function chapterIdAt(walkthroughId: string, clipId: string, t: number): string | null {
  const chapters = walkthroughId === "wt-hall-jun" ? HALL_JUN_CHAPTERS : HALL_AUG_CHAPTERS;
  return chapters.find((c) => c.clipId === clipId && t >= c.startTime && t <= c.endTime)?.id ?? null;
}

export function useCompareSession(compact: boolean, initialMode?: CompareMode) {
  const pairs = useMemo(() => datePairs(HALL_CAPTURES), []);
  const [pair, setPair] = useState<DatePair | null>(() => resolvePair(HALL_CAPTURES, HALL_CAPTURES[0].walkthroughId, HALL_CAPTURES[1].walkthroughId));
  const [anchors, setAnchors] = useState<CompareAnchor[]>(HALL_ANCHORS);
  const [issues, setIssues] = useState<CompareIssueRef[]>(HALL_ISSUES);
  const [before, setBefore] = useState<CompareLocator>(() => HALL_ANCHORS[1].before);
  const [mode, setMode] = useState<CompareMode>(() => initialMode ?? defaultMode(compact, true));
  const [swipe, setSwipe] = useState(50);
  const [opacity, setOpacity] = useState(0.46);
  const [showingAfter, setShowingAfter] = useState(false);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);

  const mapped = pair ? mapThroughAnchors(anchors, before) : null;
  const after: CompareLocator = mapped
    ? { ...mapped.locator, ...linkedLook(mapped.locator, mapped.sourceBase, before) }
    : locatorFromView({
        walkthroughId: pair?.after.walkthroughId ?? "wt-hall-aug",
        clipId: HALL_AUG_CLIP.id,
        tSeconds: before.tSeconds,
        yawDeg: before.yawDeg,
        pitchDeg: before.pitchDeg,
      });
  const gate = overlayGate(anchors, before, after);
  const modes = compact ? mobileModes(gate.enabled) : desktopModes(gate.enabled);
  const activeMode = modes.includes(mode) ? mode : modes[0];

  function look(yawDeg: number, pitchDeg: number) {
    setBefore((cur) => ({ ...cur, yawDeg, pitchDeg }));
  }

  function scrub(tSeconds: number) {
    setBefore((cur) => ({
      ...cur,
      tSeconds,
      chapterId: chapterIdAt(cur.walkthroughId, cur.clipId, tSeconds),
    }));
  }

  function proposeMatch() {
    if (!pair) return;
    setCandidates(matchCandidates({
      source: before,
      sourceChapters: HALL_JUN_CHAPTERS,
      sourceWaypoints: HALL_JUN_WAYPOINTS,
      destWalkthroughId: pair.after.walkthroughId,
      destClips: [HALL_AUG_CLIP],
      destChapters: HALL_AUG_CHAPTERS,
      destWaypoints: HALL_AUG_WAYPOINTS,
    }));
  }

  function confirmMatch(hit: MatchCandidate) {
    if (!pair) return;
    setAnchors((cur) => [
      ...cur,
      {
        id: `an-${Date.now()}`,
        projectId: HALL_PROJECT_ID,
        label: hit.label,
        beforeWalkthroughId: pair.before.walkthroughId,
        afterWalkthroughId: pair.after.walkthroughId,
        before,
        after: hit.locator,
        createdAt: new Date().toISOString(),
      },
    ]);
    setCandidates([]);
  }

  function setIssue(id: string, verification: CompareIssueRef["verification"]) {
    setIssues((cur) => cur.map((row) => row.id === id ? { ...row, verification } : row));
  }

  return {
    pair, pairs, setPair, anchors, issues, before, after, mapped, gate, modes, mode: activeMode, setMode,
    swipe, setSwipe, opacity, setOpacity, showingAfter, setShowingAfter, candidates, look, scrub,
    proposeMatch, confirmMatch, setIssue,
    duration: HALL_JUN_CLIP.durationS,
    beforeMeta: {
      capture: pair?.before ?? HALL_CAPTURES[0],
      waypoints: HALL_JUN_WAYPOINTS,
      pins: HALL_JUN_PINS,
    },
    afterMeta: {
      capture: pair?.after ?? HALL_CAPTURES[1],
      waypoints: HALL_AUG_WAYPOINTS,
      pins: HALL_AUG_PINS,
    },
  };
}
