export const APPEARANCE_STALL_MS = 8_000;

export type SpatialLoadPhase =
  | "BOOTING"
  | "PANORAMA_READY"
  | "GEOMETRY_READY"
  | "REALITY_READY"
  | "DEGRADED"
  | "FAILED";

export type ByteProgress = {
  loadedBytes: number;
  totalBytes: number | null;
  lastProgressAt: number;
  bytesPerSecond: number;
  stalled: boolean;
  failed: boolean;
};

export function isByteStall(lastProgressAt: number, now: number, loadedBytes: number, done: boolean): boolean {
  if (done || loadedBytes < 0) return false;
  return now - lastProgressAt >= APPEARANCE_STALL_MS;
}

export function spatialPhase(input: {
  panoramaReady: boolean;
  geometryReady: boolean;
  realityReady: boolean;
  geometryFailed: boolean;
  realityFailed: boolean;
  webglLost: boolean;
}): SpatialLoadPhase {
  if (input.webglLost) return input.geometryReady || input.panoramaReady ? "DEGRADED" : "FAILED";
  if (input.realityReady) return "REALITY_READY";
  if (input.geometryReady) return input.realityFailed ? "DEGRADED" : "GEOMETRY_READY";
  if (input.panoramaReady) return input.geometryFailed ? "DEGRADED" : "PANORAMA_READY";
  if (input.geometryFailed && !input.panoramaReady) return "FAILED";
  return "BOOTING";
}

export function withProxyFallback(url: string): string {
  if (url.includes("proxy=1")) return url;
  return url.includes("?") ? `${url}&proxy=1` : `${url}?proxy=1`;
}

/** Spark workers cannot fetch blob: URLs. Pass an absolute same-origin http(s) URL. */
export function absoluteSameOriginUrl(url: string): string {
  if (!url || url.startsWith("blob:") || url.startsWith("http://") || url.startsWith("https://")) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).href;
}

export function appearanceStatusCopy(progress: Pick<ByteProgress, "loadedBytes" | "totalBytes" | "stalled" | "failed">): {
  message: string;
  retry: boolean;
} | null {
  if (progress.failed) {
    return { message: "Reality unavailable — Geometry remains available", retry: true };
  }
  if (progress.stalled) {
    const pct =
      progress.totalBytes && progress.totalBytes > 0
        ? Math.round((progress.loadedBytes / progress.totalBytes) * 100)
        : null;
    return {
      message: pct == null ? "Reality is still loading" : `Reality is still loading · ${pct}%`,
      retry: false,
    };
  }
  if (progress.loadedBytes > 0 && progress.totalBytes && progress.totalBytes > progress.loadedBytes) {
    const pct = Math.round((progress.loadedBytes / progress.totalBytes) * 100);
    return { message: `Reality is still loading · ${pct}%`, retry: false };
  }
  return null;
}
