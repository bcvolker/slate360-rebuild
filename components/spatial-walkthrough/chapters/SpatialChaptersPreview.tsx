"use client";

import { useSearchParams } from "next/navigation";
import { ChapterWalkthroughExperience } from "@/components/spatial-walkthrough/viewer/ChapterWalkthroughExperience";
import { WalkthroughSpaceList } from "@/components/spatial-walkthrough/WalkthroughSpaceList";
import { spaceLibraryCards } from "@/lib/spatial-walkthrough/space-cards";
import {
  PREVIEW_CHAPTERS,
  PREVIEW_CHAPTER_WAYPOINTS,
  PREVIEW_CLIPS,
  PREVIEW_EDGES,
  PREVIEW_PATCH,
  PREVIEW_PINS,
  PREVIEW_THEME,
} from "@/lib/spatial-walkthrough/chapter-preview-fixtures";
import { EMPTY_LOCATOR } from "@/lib/spatial-walkthrough/share-locator";
import "@/components/spatial-walkthrough/viewer/walkthrough-chrome.css";

function Frame({
  chapterId,
  pickerOpen = false,
  fade = false,
}: {
  chapterId?: string | null;
  pickerOpen?: boolean;
  fade?: boolean;
}) {
  const clip = chapterId ? PREVIEW_CLIPS.find((c) => PREVIEW_CHAPTERS.find((ch) => ch.id === chapterId)?.clipId === c.id) : PREVIEW_CLIPS[0];
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
        operatorPatch={PREVIEW_PATCH}
        preview
        duration={clip?.durationS ?? 420}
        clips={PREVIEW_CLIPS}
        chapters={PREVIEW_CHAPTERS}
        edges={PREVIEW_EDGES}
        locator={{ ...EMPTY_LOCATOR, chapterId: chapterId ?? null, clipId: clip?.id ?? null }}
        pickerOpen={pickerOpen}
        walkthroughId="wt-hy"
      />
      {fade ? (
        <div className="sw-clip-fade" data-kind="exterior" style={{ animation: "none", opacity: 1 }}>
          <span className="sw-location-chip">Exterior · Exterior North</span>
        </div>
      ) : null}
    </div>
  );
}

export function SpatialChaptersPreview() {
  const scene = useSearchParams()?.get("scene") ?? "entire-walk";
  if (scene === "picker" || scene === "picker-mobile") return <Frame pickerOpen />;
  if (scene === "level-1") return <Frame chapterId="ch-l1" />;
  if (scene === "room") return <Frame chapterId="ch-mech" />;
  if (scene === "transition") return <Frame fade />;
  if (scene === "library") {
    const spaces = spaceLibraryCards(
      [{ id: "wt-hy", captured_at: "2026-08-12T15:00:00.000Z", building: "Tower A", floor: "L1", zone: "Core", walkthrough_type: "interior", status: "published" }],
      PREVIEW_CHAPTERS,
    );
    return (
      <div className="min-h-[100dvh] bg-[var(--graphite-canvas)] p-4 text-[var(--graphite-text-header)] lg:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--graphite-muted)]">Harbor Yard</p>
        <h1 className="mb-4 text-2xl font-semibold">Spaces</h1>
        <WalkthroughSpaceList items={spaces} hrefFor={(item) => `#${item.id}`} />
      </div>
    );
  }
  return <Frame />;
}
