"use client";

import { useSearchParams } from "next/navigation";
import { ChapterWalkthroughExperience } from "@/components/spatial-walkthrough/viewer/ChapterWalkthroughExperience";
import {
  PREVIEW_CHAPTERS,
  PREVIEW_CHAPTER_WAYPOINTS,
  PREVIEW_CLIPS,
  PREVIEW_EDGES,
  PREVIEW_PATCH,
  PREVIEW_PINS,
  PREVIEW_THEME,
} from "@/lib/spatial-walkthrough/chapter-preview-fixtures";
import { EMPTY_LOCATOR, type ShareLocator } from "@/lib/spatial-walkthrough/share-locator";
import type { NavMode } from "@/lib/spatial-walkthrough/nav-mode";
import "@/components/spatial-walkthrough/viewer/walkthrough-chrome.css";

function Frame({
  chapterId,
  pickerOpen = false,
  fade = false,
  mode = "explore",
  forceHud = true,
  locator,
  selectedId,
}: {
  chapterId?: string | null;
  pickerOpen?: boolean;
  fade?: boolean;
  mode?: NavMode;
  forceHud?: boolean;
  locator?: ShareLocator;
  selectedId?: string | null;
}) {
  const clip = locator?.clipId
    ? PREVIEW_CLIPS.find((c) => c.id === locator.clipId)
    : chapterId
      ? PREVIEW_CLIPS.find((c) => PREVIEW_CHAPTERS.find((ch) => ch.id === chapterId)?.clipId === c.id)
      : PREVIEW_CLIPS[0];
  return (
    <div className="relative h-[100dvh]">
      <ChapterWalkthroughExperience
        theme={PREVIEW_THEME}
        title="Harbor Yard — 12 Aug capture"
        projectName="Harbor Yard · Tower A"
        capturedAt="2026-08-12T15:00:00.000Z"
        clipId={clip?.id ?? "clip-1"}
        waypoints={PREVIEW_CHAPTER_WAYPOINTS}
        pins={PREVIEW_PINS.map((p) => ({ ...p, clipId: "clip-1" }))}
        redactions={[]}
        operatorPatch={{ ...PREVIEW_PATCH, showCompass: false }}
        preview
        duration={clip?.durationS ?? 420}
        clips={PREVIEW_CLIPS}
        chapters={PREVIEW_CHAPTERS}
        edges={PREVIEW_EDGES}
        locator={locator ?? { ...EMPTY_LOCATOR, chapterId: chapterId ?? null, clipId: clip?.id ?? null }}
        pickerOpen={pickerOpen}
        walkthroughId="wt-hy"
        shareBasePath="/w/preview-token"
        initialMode={mode}
        forceHud={forceHud}
        selectedId={selectedId}
      />
      {fade ? (
        <div className="sw-clip-fade" data-kind="aerial" style={{ animation: "none", opacity: 1 }}>
          <span className="sw-location-chip">Aerial · Roof aerial</span>
        </div>
      ) : null}
    </div>
  );
}

export function SpatialNavPreview() {
  const scene = useSearchParams()?.get("scene") ?? "explore";
  if (scene === "play" || scene === "play-mobile") return <Frame mode="play" />;
  if (scene === "briefing") return <Frame mode="briefing" forceHud={false} />;
  if (scene === "picker" || scene === "picker-mobile") return <Frame pickerOpen />;
  if (scene === "pin" || scene === "pin-mobile") return <Frame selectedId="pin-doc" />;
  if (scene === "route" || scene === "route-mobile") return <Frame forceHud />;
  if (scene === "transition" || scene === "transition-mobile") return <Frame fade />;
  if (scene === "share" || scene === "share-mobile") return <Frame />;
  if (scene === "aerial" || scene === "aerial-mobile") {
    return (
      <Frame
        locator={{ ...EMPTY_LOCATOR, clipId: "clip-2", tSeconds: 88, yawDeg: 40, pitchDeg: -10 }}
        forceHud
      />
    );
  }
  return <Frame mode="explore" />;
}
