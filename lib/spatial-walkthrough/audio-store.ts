import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AUDIO_STORAGE_PREFIX, isAudioDerivativeKey } from "./audio";
import type { WalkthroughEventKind } from "./audio-events";

export function audioObjectKey(orgId: string, walkthroughId: string, assetId: string, ext: string): string {
  const safe = ext.replace(/[^a-z0-9]+/gi, "").toLowerCase() || "webm";
  return `orgs/${orgId}/spatial-walkthrough/${walkthroughId}/${AUDIO_STORAGE_PREFIX}/${assetId}.${safe}`;
}

export function assertDerivativeAudioKey(key: string): boolean {
  return isAudioDerivativeKey(key);
}

export async function recordSpatialEvent(
  admin: SupabaseClient,
  args: {
    orgId: string;
    walkthroughId: string;
    kind: WalkthroughEventKind;
    tSeconds?: number | null;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await admin.from("spatial_walkthrough_events").insert({
      org_id: args.orgId,
      walkthrough_id: args.walkthroughId,
      kind: args.kind,
      t_seconds: args.tSeconds ?? null,
      payload: args.payload ?? {},
    });
  } catch {
    // best-effort
  }
}

export function extFromMime(mime: string | null | undefined): string {
  if (!mime) return "webm";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}
