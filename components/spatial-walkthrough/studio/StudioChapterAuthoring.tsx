"use client";

import { ChapterWalkthroughExperience } from "@/components/spatial-walkthrough/viewer/ChapterWalkthroughExperience";
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
  mediaPolicy?: "master" | "client" | "public";
  onPlayerReady?: (handle: WalkthroughPlayerHandle) => void;
  onAddWaypoint: (view: { t: number; yaw: number; pitch: number }) => void;
  onAddPin: (view: { t: number; yaw: number; pitch: number }) => void;
  narration?: import("@/lib/spatial-walkthrough/audio").NarrationSegment[];
  transcripts?: import("@/lib/spatial-walkthrough/audio").TranscriptRecord[];
};

export function StudioChapterAuthoring({
  walkthroughId, theme, title, capturedAt, clips, chapters, edges, waypoints, pins, redactions, operatorPatch, mediaPolicy = "master", onPlayerReady, onAddWaypoint, onAddPin, narration = [], transcripts = [],
}: Props) {
  const ready = clips.filter((c) => c.status === "ready");
  const clip = ready[0];
  if (!clip) return null;
  const policy = mediaPolicy === "public" ? "public" : mediaPolicy === "client" ? "client" : "master";
  const summaries: ClipSummary[] = ready.map((c, i) => ({
    id: String(c.id),
    title: (c.title as string) ?? null,
    zone: (c.zone as string) ?? null,
    durationS: Number(c.duration_s ?? 0),
    defaultYaw: Number(c.default_yaw ?? 0),
    defaultPitch: Number(c.default_pitch ?? 0),
    sortOrder: Number(c.sort_order ?? i),
    videoUrl: `/api/spatial-walkthrough/${walkthroughId}/media?clip=${c.id}&kind=proxy&policy=${policy}`,
    posterUrl: `/api/spatial-walkthrough/${walkthroughId}/media?clip=${c.id}&kind=poster&policy=${policy}`,
  }));

  return (
    <div className="absolute inset-0 min-h-0" data-testid="sw-studio-stage">
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
        chapters={chapters.map(toChapter)}
        edges={edges.map(toClipEdge)}
        locator={typeof window !== "undefined" ? parseShareLocator(window.location.search) : undefined}
        onPlayerReady={onPlayerReady}
        onAddWaypoint={onAddWaypoint}
        onAddPin={onAddPin}
        narration={narration}
        transcripts={transcripts}
      />
    </div>
  );
}
