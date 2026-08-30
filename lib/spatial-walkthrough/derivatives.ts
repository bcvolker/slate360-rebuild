import type { AccessPolicy, SharePolicy } from "./types";

export type MediaKind = "proxy" | "poster" | "master";

export type ClipKeys = {
  master_key?: string | null;
  proxy_key?: string | null;
  poster_key?: string | null;
  public_proxy_key?: string | null;
};

/** MASTER is never a share policy. Shares are CLIENT or PUBLIC only. */
export function isSharePolicy(policy: AccessPolicy): policy is SharePolicy {
  return policy === "client" || policy === "public";
}

/**
 * Derivative selection. Missing proxy/poster must NOT fall through to master.
 * Master media is only addressable under MASTER policy.
 */
export function allowedMediaKind(policy: AccessPolicy, kind: MediaKind, allowMaster = false): boolean {
  if (kind === "master") return policy === "master" && allowMaster;
  return kind === "proxy" || kind === "poster";
}

export function selectDerivativeKey(
  clip: ClipKeys,
  kind: MediaKind,
  policy: AccessPolicy,
  allowMaster = false,
): string | null {
  if (!allowedMediaKind(policy, kind, allowMaster)) return null;
  if (kind === "master") return clip.master_key ?? null;
  if (kind === "poster") return clip.poster_key ?? null;
  if (policy === "public") return clip.public_proxy_key ?? null;
  return clip.proxy_key ?? null;
}

export function stripMasterKeys<T extends Record<string, unknown>>(row: T): Omit<T, "master_key" | "master_sha256" | "master_bytes"> {
  const {
    master_key: _k,
    master_sha256: _h,
    master_bytes: _b,
    ...rest
  } = row as T & { master_key?: unknown; master_sha256?: unknown; master_bytes?: unknown };
  return rest;
}

/** Callback / PATCH must never write master object fields after ingest. */
export const FORBIDDEN_MASTER_UPDATE_KEYS = ["master_key", "master_bytes"] as const;

export function clipReadyPatch(body: {
  proxyKey?: string;
  posterKey?: string;
  manifestKey?: string;
  masterSha256?: string;
  durationSec?: number | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  captureMeta?: Record<string, unknown> | null;
  publicProxyKey?: string | null;
}): Record<string, unknown> {
  return {
    status: "ready",
    proxy_key: body.proxyKey ?? null,
    poster_key: body.posterKey ?? null,
    manifest_key: body.manifestKey ?? null,
    master_sha256: body.masterSha256 ?? null,
    duration_s: body.durationSec ?? null,
    width: body.width ?? null,
    height: body.height ?? null,
    fps: body.fps ?? null,
    processing_error: null,
    ...(body.captureMeta ? { capture_meta: body.captureMeta } : {}),
    ...(body.publicProxyKey ? { public_proxy_key: body.publicProxyKey } : {}),
  };
}

export function rejectsMasterFallthrough(clip: ClipKeys, policy: SharePolicy): boolean {
  return selectDerivativeKey(clip, "proxy", policy) == null && clip.master_key != null;
}
