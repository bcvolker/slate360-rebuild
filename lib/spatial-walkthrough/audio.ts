/** Guided narration, source camera audio, and voice notes. Never written into master media. */

export const AUDIO_STORAGE_PREFIX = "audio";

export type AudioKind = "source" | "narration" | "voice_note";
export type NarrationSource = "record" | "upload" | "replace";
export type TranscriptStatus = "none" | "pending" | "ready" | "failed" | "manual";

export type AudioAsset = {
  id: string;
  kind: "narration" | "voice_note";
  storageKey: string;
  mime: string | null;
  durationS: number | null;
  trimStartS: number;
  trimEndS: number | null;
  url?: string | null;
};

export type NarrationSegment = {
  id: string;
  walkthroughId: string;
  clipId: string;
  chapterId: string | null;
  pinId: string | null;
  assetId: string | null;
  startTime: number;
  endTime: number;
  title: string | null;
  speaker: string | null;
  volume: number;
  source: NarrationSource;
  transcriptStatus: TranscriptStatus;
  asset?: AudioAsset | null;
};

export type VoiceNoteRecord = {
  id: string;
  pinId: string;
  assetId: string | null;
  transcriptStatus: TranscriptStatus;
  asset?: AudioAsset | null;
};

export type TranscriptPhrase = {
  start: number;
  end: number;
  text: string;
  speaker?: string | null;
};

export type TranscriptWord = {
  start: number;
  end: number;
  word: string;
  speaker?: string | null;
};

export type TranscriptRecord = {
  id: string;
  walkthroughId: string;
  narrationSegmentId: string | null;
  voiceNoteId: string | null;
  provider: string;
  language: string;
  fullText: string;
  phrases: TranscriptPhrase[];
  words: TranscriptWord[] | null;
};

export function isAudioDerivativeKey(key: string): boolean {
  return key.includes("/audio/") && !key.includes("/master.");
}

export function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return Math.min(1, Math.max(0, v));
}

export function segmentAtTime(segments: NarrationSegment[], clipId: string, t: number): NarrationSegment | null {
  return segments.find((s) => s.clipId === clipId && t >= s.startTime && t < s.endTime) ?? null;
}

export function segmentsOnClip(segments: NarrationSegment[], clipId: string): NarrationSegment[] {
  return segments.filter((s) => s.clipId === clipId).slice().sort((a, b) => a.startTime - b.startTime);
}

/** Offset into the audio file for video time t. Null when outside the segment. */
export function narrationMediaTime(segment: NarrationSegment, t: number): number | null {
  if (t < segment.startTime || t >= segment.endTime) return null;
  const trimStart = segment.asset?.trimStartS ?? 0;
  return t - segment.startTime + trimStart;
}

export function mixVolumes(args: {
  sourceVolume: number;
  narrationVolume: number;
  duckSource: boolean;
  narrationActive: boolean;
}): { source: number; narration: number } {
  const narration = args.narrationActive ? clampVolume(args.narrationVolume) : 0;
  let source = clampVolume(args.sourceVolume);
  if (args.duckSource && args.narrationActive) source *= 0.12;
  return { source, narration };
}

export function dragSegment(
  segment: NarrationSegment,
  deltaS: number,
  clipDuration: number,
): NarrationSegment {
  const length = segment.endTime - segment.startTime;
  let start = segment.startTime + deltaS;
  let end = start + length;
  if (start < 0) {
    end -= start;
    start = 0;
  }
  if (end > clipDuration) {
    start = Math.max(0, clipDuration - length);
    end = start + length;
  }
  return { ...segment, startTime: start, endTime: end };
}

export function trimSegment(
  segment: NarrationSegment,
  startTime: number,
  endTime: number,
): NarrationSegment | null {
  if (!(endTime > startTime + 0.15)) return null;
  return { ...segment, startTime, endTime };
}

export function narrationBands(
  segments: NarrationSegment[],
  clipId: string,
  duration: number,
  activeId: string | null,
): Array<{ id: string; startPct: number; widthPct: number; active: boolean; title: string }> {
  if (!(duration > 0)) return [];
  return segmentsOnClip(segments, clipId).map((s) => {
    const start = Math.max(0, Math.min(100, (s.startTime / duration) * 100));
    const end = Math.max(0, Math.min(100, (s.endTime / duration) * 100));
    return {
      id: s.id,
      title: s.title ?? "Narration",
      startPct: start,
      widthPct: Math.max(1.2, end - start),
      active: activeId === s.id,
    };
  });
}

export function hydrateNarration(
  rows: Array<Record<string, unknown>>,
  assets: Array<Record<string, unknown>>,
  walkthroughId: string,
): NarrationSegment[] {
  return rows.map((row) => {
    const seg = toNarrationSegment(row);
    const asset = assets.find((a) => String(a.id) === String(seg.assetId));
    if (asset) {
      seg.asset = {
        id: String(asset.id),
        kind: "narration",
        storageKey: String(asset.storage_key ?? asset.storageKey ?? ""),
        mime: typeof asset.mime === "string" ? asset.mime : null,
        durationS: asset.duration_s == null && asset.durationS == null ? null : Number(asset.duration_s ?? asset.durationS),
        trimStartS: Number(asset.trim_start_s ?? asset.trimStartS ?? 0),
        trimEndS: asset.trim_end_s == null && asset.trimEndS == null ? null : Number(asset.trim_end_s ?? asset.trimEndS),
        url: `/api/spatial-walkthrough/${walkthroughId}/audio?asset=${asset.id}`,
      };
    }
    return seg;
  });
}

export function toNarrationSegment(row: Record<string, unknown>): NarrationSegment {
  const status = String(row.transcript_status ?? row.transcriptStatus ?? "none");
  const source = String(row.source ?? "upload");
  return {
    id: String(row.id),
    walkthroughId: String(row.walkthrough_id ?? row.walkthroughId),
    clipId: String(row.clip_id ?? row.clipId),
    chapterId: row.chapter_id || row.chapterId ? String(row.chapter_id ?? row.chapterId) : null,
    pinId: row.pin_id || row.pinId ? String(row.pin_id ?? row.pinId) : null,
    assetId: row.asset_id || row.assetId ? String(row.asset_id ?? row.assetId) : null,
    startTime: Number(row.start_time ?? row.startTime ?? 0),
    endTime: Number(row.end_time ?? row.endTime ?? 0),
    title: typeof row.title === "string" ? row.title : null,
    speaker: typeof row.speaker === "string" ? row.speaker : null,
    volume: clampVolume(Number(row.volume ?? 1)),
    source: source === "record" || source === "replace" ? source : "upload",
    transcriptStatus: (["none", "pending", "ready", "failed", "manual"] as TranscriptStatus[]).includes(status as TranscriptStatus)
      ? (status as TranscriptStatus)
      : "none",
  };
}

/** CLIENT narration authoring is reserved; CEO/admin only until product enables collaborators. */
export function canAuthorNarration(args: { isCeo: boolean; canAuthor: boolean }): boolean {
  return args.isCeo || args.canAuthor;
}
