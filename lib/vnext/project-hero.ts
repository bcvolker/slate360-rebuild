import {
  HERO_PRIORITY,
  VNEXT_REPRESENTATIONS,
  type VnextHeroCandidates,
  type VnextHeroKind,
  type VnextHeroResult,
  type VnextRepresentation,
} from "./portfolio-types";

const HERO_LABEL: Record<Exclude<VnextHeroKind, "neutral">, keyof VnextHeroCandidates> = {
  reality: "reality",
  pano360: "pano360",
  drone: "drone",
  plan: "plan",
  projectImage: "projectImage",
  satellite: "satellite",
};

/**
 * Hero sources, in locked Phase 1 order:
 * 1. Reality still — `digital_twin_models.preview_storage_key` via `/api/digital-twin/models/[id]/preview-image`
 * 2. 360 preview — `site_walk_items` `photo_360` via `/api/site-walk/items/[id]/image`
 * 3. Aerial/drone still — twin `drone_photo` storage key when a fetchable URL can be produced
 * 4. Plan thumbnail — `site_walk_plan_sheets` via `/api/site-walk/plan-sheets/[id]/image`
 * 5. Project image — `projects.thumbnail_url`
 * 6. Satellite — `/api/static-map` when lat/lng exist (existing Maps Static proxy)
 * 7. Neutral placeholder — no image URL
 *
 * Drone stills often have no dedicated image route; those projects fall through.
 * Representation chips are independent of which hero image won.
 */
export function isUsableImageUrl(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "none") return false;
  if (lower.startsWith("javascript:")) return false;
  if (lower.startsWith("data:text")) return false;
  if (lower.startsWith("http://") || lower.startsWith("https://")) return true;
  if (lower.startsWith("data:image/")) return true;
  if (url.startsWith("/api/") || url.startsWith("/vnext/") || url.startsWith("/preview/")) return true;
  if (url.startsWith("/vnext-preview/") && /\.(svg|jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(url)) return true;
  return false;
}

export function pickHeroKind(available: Record<Exclude<VnextHeroKind, "neutral">, boolean>): VnextHeroKind {
  for (const kind of HERO_PRIORITY) {
    if (kind === "neutral") return "neutral";
    if (available[kind]) return kind;
  }
  return "neutral";
}

export function resolveProjectHero(candidates: VnextHeroCandidates): VnextHeroResult {
  const available = {
    reality: isUsableImageUrl(candidates.reality),
    pano360: isUsableImageUrl(candidates.pano360),
    drone: isUsableImageUrl(candidates.drone),
    plan: isUsableImageUrl(candidates.plan),
    projectImage: isUsableImageUrl(candidates.projectImage),
    satellite: isUsableImageUrl(candidates.satellite),
  };
  const kind = pickHeroKind(available);
  if (kind === "neutral") return { kind, url: null };
  const url = candidates[HERO_LABEL[kind]];
  return { kind, url: isUsableImageUrl(url) ? String(url).trim() : null };
}

export function resolveRepresentations(flags: Partial<Record<VnextRepresentation, boolean>>): VnextRepresentation[] {
  return VNEXT_REPRESENTATIONS.filter((id) => flags[id] === true);
}

export function satelliteMapUrl(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return `/api/static-map?center=${lat},${lng}&zoom=16&size=800x450&maptype=satellite`;
}

export function pickLatestIso(values: Array<string | null | undefined>): string | null {
  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!value || !value.trim()) continue;
    const ms = Date.parse(value);
    if (!Number.isFinite(ms)) continue;
    if (ms > latestMs) {
      latestMs = ms;
      latest = value;
    }
  }
  return latest;
}

export function formatDocumentedDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
  return `Last documented ${formatted}`;
}

export const REPRESENTATION_LABEL: Record<VnextRepresentation, string> = {
  reality: "Reality",
  geometry: "Geometry",
  "360": "360",
  plan: "Plan",
  drone: "Drone",
  thermal: "Thermal",
};
