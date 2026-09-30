/** Walkthrough ↔ 360 station without leaving project context. */

export type StationNear = {
  stationId: string;
  href: string;
  returnHref: string;
};

export function stationNearWalk(args: {
  token: string;
  t: number;
  yaw: number;
  pitch: number;
  stations: Array<{ id: string; t?: number | null; href: string }>;
  windowS?: number;
}): StationNear | null {
  const windowS = args.windowS ?? 4;
  const hit = args.stations
    .filter((s) => s.t != null && Math.abs((s.t ?? 0) - args.t) <= windowS)
    .sort((a, b) => Math.abs((a.t ?? 0) - args.t) - Math.abs((b.t ?? 0) - args.t))[0];
  if (!hit) return null;
  const ret = new URLSearchParams({ t: String(args.t), yaw: String(args.yaw), pitch: String(args.pitch) });
  return {
    stationId: hit.id,
    href: `${hit.href}${hit.href.includes("?") ? "&" : "?"}from=walk&${ret.toString()}`,
    returnHref: `/w/${args.token}?${ret.toString()}`,
  };
}
