/**
 * Resolves a project's display location from metadata and/or a profile address.
 * Pure utility — no side effects.
 */
export function resolveProjectLocation(
  metadata: unknown,
  profileAddress: string | null | undefined,
): {
  label: string;
  center: { lat: number; lng: number } | null;
} {
  const parseMaybeNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const meta = (
    metadata && typeof metadata === "object"
      ? (metadata as Record<string, unknown>)
      : {}
  ) as Record<string, unknown>;
  let locValue = meta.location;

  if (typeof locValue === "string") {
    const trimmed = locValue.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        locValue = parsed;
      } catch {
        // fall through
      }
    }
  }

  let center: { lat: number; lng: number } | null = null;
  let label: string | null = null;

  if (locValue && typeof locValue === "object") {
    const loc = locValue as Record<string, unknown>;
    const lat = parseMaybeNumber(loc.lat);
    const lng = parseMaybeNumber(loc.lng);
    if (lat !== null && lng !== null) center = { lat, lng };

    if (typeof loc.address === "string" && loc.address.trim()) label = loc.address.trim();
    else if (typeof loc.label === "string" && loc.label.trim()) label = loc.label.trim();
  } else if (typeof locValue === "string" && locValue.trim()) {
    label = locValue.trim();
  }

  const metaAddress = typeof meta.address === "string" ? meta.address.trim() : "";
  const metaCity    = typeof meta.city    === "string" ? meta.city.trim()    : "";
  const metaState   = typeof meta.state   === "string" ? meta.state.trim()   : "";
  const cityState   = [metaCity, metaState].filter(Boolean).join(", ");

  const fallbackLabel =
    (typeof profileAddress === "string" && profileAddress.trim()) ||
    label ||
    metaAddress ||
    cityState ||
    "";

  return { label: fallbackLabel, center };
}
