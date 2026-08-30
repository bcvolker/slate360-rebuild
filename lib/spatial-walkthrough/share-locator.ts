export type ShareLocator = {
  walkthroughId: string | null;
  clipId: string | null;
  chapterId: string | null;
  tSeconds: number | null;
  yawDeg: number | null;
  pitchDeg: number | null;
  pinId: string | null;
  itemId?: string | null;
};

export const EMPTY_LOCATOR: ShareLocator = {
  walkthroughId: null,
  clipId: null,
  chapterId: null,
  tSeconds: null,
  yawDeg: null,
  pitchDeg: null,
  pinId: null,
  itemId: null,
};

function readNum(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseShareLocator(search: string | URLSearchParams): ShareLocator {
  const params = typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search) : search;
  return {
    walkthroughId: params.get("walkthrough") || params.get("wt") || null,
    clipId: params.get("clip") || null,
    chapterId: params.get("chapter") || null,
    tSeconds: readNum(params, "t") ?? readNum(params, "time"),
    yawDeg: readNum(params, "yaw"),
    pitchDeg: readNum(params, "pitch"),
    pinId: params.get("pin") || null,
    itemId: params.get("item") || null,
  };
}

export function serializeShareLocator(locator: ShareLocator): string {
  const params = new URLSearchParams();
  if (locator.clipId) params.set("clip", locator.clipId);
  if (locator.chapterId) params.set("chapter", locator.chapterId);
  if (locator.tSeconds != null) params.set("t", String(Number(locator.tSeconds.toFixed(3))));
  if (locator.yawDeg != null) params.set("yaw", String(Number(locator.yawDeg.toFixed(2))));
  if (locator.pitchDeg != null) params.set("pitch", String(Number(locator.pitchDeg.toFixed(2))));
  if (locator.pinId) params.set("pin", locator.pinId);
  if (locator.itemId) params.set("item", locator.itemId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Bare /w/{token} with no query is Entire Walk at the first clip. */
export function isLegacyShareUrl(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return ![...params.keys()].some((k) => ["clip", "chapter", "t", "time", "yaw", "pitch", "pin", "item"].includes(k));
}

export function mergeLocator(base: ShareLocator, overlay: Partial<ShareLocator>): ShareLocator {
  return { ...base, ...overlay };
}

export function sharePath(token: string, locator: ShareLocator = EMPTY_LOCATOR): string {
  return `/w/${token}${serializeShareLocator(locator)}`;
}

export function locatorFromView(input: {
  clipId?: string | null;
  chapterId?: string | null;
  tSeconds: number;
  yawDeg: number;
  pitchDeg: number;
  pinId?: string | null;
  itemId?: string | null;
  walkthroughId?: string | null;
}): ShareLocator {
  return {
    walkthroughId: input.walkthroughId ?? null,
    clipId: input.clipId ?? null,
    chapterId: input.chapterId ?? null,
    tSeconds: input.tSeconds,
    yawDeg: input.yawDeg,
    pitchDeg: input.pitchDeg,
    pinId: input.pinId ?? null,
    itemId: input.itemId ?? null,
  };
}

/** Path + query for the current sphere state. `basePath` is `/w/{token}` or the studio pathname. */
export function currentViewHref(basePath: string, locator: ShareLocator): string {
  const path = (basePath.split("?")[0] || "/").replace(/\/$/, "") || "/";
  return `${path}${serializeShareLocator(locator)}`;
}

export function absoluteViewHref(origin: string, basePath: string, locator: ShareLocator): string {
  return `${origin.replace(/\/$/, "")}${currentViewHref(basePath, locator)}`;
}
