import type { ChapterRecord } from "./chapters";
import type { ClipEdgeRecord, ClipSummary } from "./clip-edges";
import { parseExperienceProfile, type ExperienceProfile } from "./experience-profile";
import type { RedactionRule } from "./redaction";
import { resolveBrandTheme } from "./theme";
import type { OperatorKeyframe } from "./keyframes";
import { operatorKeyframesFromRaw } from "./housewalk-operator";
import type { BrandTheme, OperatorPatch, WaypointRecord } from "./types";

export type WalkBoot = {
  walkId: string;
  title: string;
  posterUrl: string | null;
  brand: import("./types").BrandTheme | null;
  accessState: "open" | "password" | "denied";
};

export type SharePayload = {
  theme: BrandTheme;
  operatorPatch: OperatorPatch | null;
  operatorKeyframes: OperatorKeyframe[];
  orientation?: {
    source: "manual" | "oem";
    keyframes: Array<{ t: number; rollDeg: number; pitchDeg: number; yawDeg: number }>;
    bakeable: boolean;
  } | null;
  allowDownload: boolean;
  walkthrough: { id?: string; title: string; capturedAt?: string | null; building?: string | null };
  clip: { id: string; proxyUrl: string; posterUrl: string | null; durationS?: number } | null;
  clips: ClipSummary[];
  chapters: ChapterRecord[];
  edges: ClipEdgeRecord[];
  lockedChapterId: string | null;
  waypoints: WaypointRecord[];
  pins: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
  redactions: RedactionRule[];
  profile: ExperienceProfile;
};

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function arr<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function normalizeSharePayload(raw: unknown): SharePayload {
  const o = rec(raw);
  const walk = rec(o.walkthrough);
  const clip = o.clip && typeof o.clip === "object" ? rec(o.clip) : null;
  const theme = resolveBrandTheme({
    snapshot: o.theme ?? null,
    canHidePoweredBy: true,
  });
  return {
    theme,
    operatorPatch: (o.operatorPatch as OperatorPatch | null) ?? null,
    operatorKeyframes: (() => {
      const fromPatch = operatorKeyframesFromRaw(o.operatorPatch);
      return fromPatch.length ? fromPatch : operatorKeyframesFromRaw(o);
    })(),
    orientation: o.orientation && typeof o.orientation === "object" ? (o.orientation as SharePayload["orientation"]) : null,
    allowDownload: o.allowDownload === true,
    walkthrough: {
      id: str(walk.id) || undefined,
      title: str(walk.title, "Spatial Walkthrough"),
      capturedAt: (walk.capturedAt as string | null) ?? null,
      building: (walk.building as string | null) ?? null,
    },
    clip: clip && str(clip.id)
      ? {
          id: str(clip.id),
          proxyUrl: str(clip.proxyUrl),
          posterUrl: typeof clip.posterUrl === "string" ? clip.posterUrl : null,
          durationS: Number(clip.durationS ?? 0) || 0,
        }
      : null,
    clips: arr<ClipSummary>(o.clips),
    chapters: arr<ChapterRecord>(o.chapters),
    edges: arr<ClipEdgeRecord>(o.edges),
    lockedChapterId: typeof o.lockedChapterId === "string" ? o.lockedChapterId : null,
    waypoints: arr<WaypointRecord>(o.waypoints),
    pins: arr<Record<string, unknown>>(o.pins),
    attachments: arr<Record<string, unknown>>(o.attachments),
    redactions: arr<RedactionRule>(o.redactions),
    profile: parseExperienceProfile(o.profile ?? o.experienceProfile),
  };
}

export function mapSharePins(
  pins: Array<Record<string, unknown>> | undefined,
  attachments: Array<Record<string, unknown>> | undefined,
  token: string,
  allowDownload: boolean,
): Array<{
  id: string;
  label: string;
  pinType: string;
  body: string | null;
  yawDeg: number;
  pitchDeg: number;
  tSeconds: number | null;
  clipId: string | null;
  walkthroughId: string | null;
  attachments: Array<{
    id: string;
    kind: "url" | "slatedrop";
    title: string | null;
    url: string | null;
    previewUrl: string | null;
    downloadUrl: string | null;
    fileName: string | null;
  }>;
}> {
  return arr<Record<string, unknown>>(pins).map((p) => {
    const id = String(p.id ?? "");
    const atts = arr<Record<string, unknown>>(attachments)
      .filter((a) => String(a.pin_id ?? "") === id)
      .map((a) => {
        const kind = a.kind === "url" ? ("url" as const) : ("slatedrop" as const);
        const fileUrl = `/api/spatial-walkthrough/public/${token}/file?attachmentId=${a.id}`;
        return {
          id: String(a.id ?? ""),
          kind,
          title: (a.title as string) ?? null,
          url: (a.external_url as string) ?? null,
          previewUrl: kind === "slatedrop" ? fileUrl : null,
          downloadUrl: kind === "slatedrop" && allowDownload ? `${fileUrl}&download=1` : (a.external_url as string) ?? null,
          fileName: (a.title as string) ?? null,
        };
      });
    return {
      id,
      label: String(p.label ?? "Pin"),
      pinType: String(p.pin_type ?? "document"),
      body: (p.body as string) ?? null,
      yawDeg: Number(p.yaw_deg ?? 0),
      pitchDeg: Number(p.pitch_deg ?? 0),
      tSeconds: p.t_seconds == null ? null : Number(p.t_seconds),
      clipId: p.clip_id ? String(p.clip_id) : null,
      walkthroughId: p.walkthrough_id ? String(p.walkthrough_id) : null,
      attachments: atts,
    };
  });
}

export function shareClipList(payload: SharePayload): ClipSummary[] {
  if (payload.clips.length) return payload.clips;
  if (!payload.clip) return [];
  return [
    {
      id: payload.clip.id,
      title: payload.walkthrough.title,
      zone: null,
      durationS: Number(payload.clip.durationS ?? 0),
      defaultYaw: 0,
      defaultPitch: 0,
      sortOrder: 0,
      videoUrl: payload.clip.proxyUrl,
      posterUrl: payload.clip.posterUrl,
    },
  ];
}
