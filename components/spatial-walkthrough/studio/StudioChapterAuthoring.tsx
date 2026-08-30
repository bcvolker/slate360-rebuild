"use client";

import { useState, type ReactNode } from "react";
import { ChapterWalkthroughExperience } from "@/components/spatial-walkthrough/viewer/ChapterWalkthroughExperience";
import { StudioChapterPanel } from "./StudioChapterPanel";
import { StudioClipEdges } from "./StudioClipEdges";
import { toChapter } from "@/lib/spatial-walkthrough/chapters";
import { toClipEdge, type ClipSummary } from "@/lib/spatial-walkthrough/clip-edges";
import { parseShareLocator } from "@/lib/spatial-walkthrough/share-locator";
import type { BrandTheme, OperatorPatch, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import type { ExperiencePin } from "@/components/spatial-walkthrough/viewer/WalkthroughExperience";
import type { WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";

type Props = {
  walkthroughId: string;
  theme: BrandTheme;
  title: string;
  capturedAt: string | null;
  clips: Array<Record<string, unknown>>;
  chapters: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
  waypoints: WaypointRecord[];
  pins: ExperiencePin[];
  redactions: RedactionRule[];
  operatorPatch: OperatorPatch;
  onPlayerReady?: (handle: WalkthroughPlayerHandle) => void;
  onAddWaypoint: (view: { t: number; yaw: number; pitch: number }) => void;
  onAddPin: (view: { t: number; yaw: number; pitch: number }) => void;
  onRefresh: () => void;
  overlay?: ReactNode;
};

export function StudioChapterAuthoring({
  walkthroughId, theme, title, capturedAt, clips, chapters, edges, waypoints, pins, redactions, operatorPatch, onPlayerReady, onAddWaypoint, onAddPin, onRefresh, overlay,
}: Props) {
  const [mark, setMark] = useState<{ start: number | null; end: number | null; yaw: number; pitch: number }>({ start: null, end: null, yaw: 0, pitch: 0 });
  const ready = clips.filter((c) => c.status === "ready");
  const clip = ready[0];
  const summaries: ClipSummary[] = ready.map((c, i) => ({
    id: String(c.id),
    title: (c.title as string) ?? null,
    zone: (c.zone as string) ?? null,
    durationS: Number(c.duration_s ?? 0),
    defaultYaw: Number(c.default_yaw ?? 0),
    defaultPitch: Number(c.default_pitch ?? 0),
    sortOrder: Number(c.sort_order ?? i),
    videoUrl: `/api/spatial-walkthrough/${walkthroughId}/media?clip=${c.id}&kind=proxy`,
    posterUrl: `/api/spatial-walkthrough/${walkthroughId}/media?clip=${c.id}&kind=poster`,
  }));
  const chapterRows = chapters.map(toChapter);
  const edgeRows = edges.map(toClipEdge);
  if (!clip) return null;

  return (
    <>
      <div className="relative h-[52vh] overflow-hidden border border-white/10 lg:h-[58vh]">
        <ChapterWalkthroughExperience
          theme={theme}
          title={title}
          videoUrl={summaries[0].videoUrl}
          posterUrl={summaries[0].posterUrl}
          clipId={String(clip.id)}
          duration={Number(clip.duration_s ?? 0)}
          waypoints={waypoints}
          pins={pins}
          redactions={redactions}
          operatorPatch={operatorPatch}
          authoring
          capturedAt={capturedAt}
          walkthroughId={walkthroughId}
          clips={summaries}
          chapters={chapterRows}
          edges={edgeRows}
          locator={typeof window !== "undefined" ? parseShareLocator(window.location.search) : undefined}
          onPlayerReady={onPlayerReady}
          onAddWaypoint={onAddWaypoint}
          onAddPin={onAddPin}
          onStartSpace={(view) => setMark((m) => ({ ...m, start: view.t, yaw: view.yaw, pitch: view.pitch }))}
          onEndSpace={(view) => setMark((m) => ({ ...m, end: view.t, yaw: view.yaw, pitch: view.pitch }))}
        />
        {overlay}
      </div>
      <StudioChapterPanel
        walkthroughId={walkthroughId}
        clip={summaries[0] ?? null}
        chapters={chapterRows}
        mark={mark}
        onRefresh={onRefresh}
        onClearMark={() => setMark({ start: null, end: null, yaw: 0, pitch: 0 })}
      />
      <StudioClipEdges walkthroughId={walkthroughId} clips={summaries} edges={edgeRows} onRefresh={onRefresh} />
    </>
  );
}
