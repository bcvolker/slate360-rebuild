import {
  SlateContentEditSpecSchema,
  SLATE_CONTENT_SPEC_VERSION,
  type SlateContentEditSpec,
} from "./spec-core";

/**
 * Spec bridge — assembles a validated `SlateContentEditSpec` from the editor's
 * resolved timeline. This is the single serialization point every render flows
 * through: the worker consumes the frozen spec, never the live editor state.
 *
 * Color/effects/transitions/audio attach here as they graduate (each becomes a
 * field on the clip or spec); until then the worker just sees clips + output.
 */

export type RenderClipInput = {
  id?: string;
  assetId: string;
  storageKey: string | null; // resolved server-side (proxy preferred)
  trimInSec: number;
  trimOutSec: number;
  speedFactor: number;
  reversed?: boolean;
  mediaKind?: "video" | "image" | "equirect_video";
};

export type RenderOutputInput = {
  width: number;
  height: number;
  fps?: number;
  quality?: string; // draft | standard | high
};

const QUALITY_CRF: Record<string, number> = { draft: 26, standard: 20, high: 16 };
const QUALITY_PRESET: Record<string, "veryfast" | "medium" | "slow"> = {
  draft: "veryfast",
  standard: "medium",
  high: "slow",
};

export function buildEditSpec(args: {
  editProjectId: string;
  orgId: string;
  projectId?: string | null;
  clips: RenderClipInput[];
  output: RenderOutputInput;
}): SlateContentEditSpec {
  let cursor = 0;
  const clips = args.clips
    .filter((c) => !!c.storageKey)
    .map((c, i) => {
      const cutInSec = Math.max(0, c.trimInSec || 0);
      const cutOutSec = Math.max(cutInSec + 0.05, c.trimOutSec || cutInSec + 0.05);
      const speed = Math.min(4, Math.max(0.25, c.speedFactor || 1));
      const timelineStartSec = cursor;
      cursor += (cutOutSec - cutInSec) / speed;
      return {
        id: c.id ?? `clip_${i}`,
        assetId: c.assetId,
        storageKey: c.storageKey as string,
        mediaKind: c.mediaKind ?? "video",
        timelineStartSec,
        cutInSec,
        cutOutSec,
        speed,
        reverse: !!c.reversed,
        embeddedAudio: "keep" as const,
        layers: [],
      };
    });

  const q = args.output.quality ?? "standard";
  return SlateContentEditSpecSchema.parse({
    version: SLATE_CONTENT_SPEC_VERSION,
    editProjectId: args.editProjectId,
    orgId: args.orgId,
    projectId: args.projectId ?? null,
    timeline: { durationSec: cursor, clips },
    audio: { tracks: [], normalize: true },
    output: {
      width: args.output.width,
      height: args.output.height,
      fps: args.output.fps ?? 30,
      crf: QUALITY_CRF[q] ?? 20,
      preset: QUALITY_PRESET[q] ?? "medium",
    },
    extensions: {},
  });
}
