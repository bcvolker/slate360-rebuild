export type ResolvedProjectLocation = {
  label: string;
  lat: number | null;
  lng: number | null;
  center: { lat: number; lng: number } | null;
};

type ResolveLocationOptions = {
  preferredLabel?: string | null;
  fallbackAddress?: string | null;
  legacyLocation?: string | null;
  city?: string | null;
  state?: string | null;
  region?: string | null;
};

function parseMaybeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveProjectLocation(
  metadata: unknown,
  options: ResolveLocationOptions = {}
): ResolvedProjectLocation {
  const meta = metadata && typeof metadata === "object"
    ? (metadata as Record<string, unknown>)
    : {};

  let locationValue: unknown = meta.location;

  if (typeof locationValue === "string") {
    const trimmed = locationValue.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        locationValue = JSON.parse(trimmed) as unknown;
      } catch {
        locationValue = trimmed;
      }
    }
  }

  let lat: number | null = null;
  let lng: number | null = null;
  let locationLabel = "";

  if (locationValue && typeof locationValue === "object") {
    const locationObj = locationValue as Record<string, unknown>;
    lat = parseMaybeNumber(locationObj.lat);
    lng = parseMaybeNumber(locationObj.lng);
    locationLabel = toTrimmedString(locationObj.address) || toTrimmedString(locationObj.label);
  } else {
    locationLabel = toTrimmedString(locationValue);
  }

  const metaAddress = toTrimmedString(meta.address);
  const metaCity = toTrimmedString(meta.city);
  const metaState = toTrimmedString(meta.state);
  const cityState = [metaCity || toTrimmedString(options.city), metaState || toTrimmedString(options.state)]
    .filter(Boolean)
    .join(", ");

  const fallbackRegion = toTrimmedString(options.region);
  const label =
    toTrimmedString(options.preferredLabel) ||
    locationLabel ||
    toTrimmedString(options.fallbackAddress) ||
    toTrimmedString(options.legacyLocation) ||
    metaAddress ||
    cityState ||
    fallbackRegion ||
    "";

  return {
    label,
    lat,
    lng,
    center: lat !== null && lng !== null ? { lat, lng } : null,
  };
}
