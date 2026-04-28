import type { LiveItemGroup, LiveWalkItem } from "./live-walk-types";

export function getLocationLabel(item: LiveWalkItem) {
  if (item.location_label?.trim()) return item.location_label.trim();
  const [location] = item.title.split(" — ");
  return location?.trim() || "Unassigned location";
}

export function getItemDetail(item: LiveWalkItem) {
  const parts = item.title.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : item.title || item.item_type;
}

export function groupItemsByLocation(items: LiveWalkItem[]): LiveItemGroup[] {
  const groups = new Map<string, LiveWalkItem[]>();
  for (const item of items) {
    const label = getLocationLabel(item);
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  return Array.from(groups.entries()).map(([location, grouped]) => ({
    location,
    items: grouped.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
  }));
}

export function elapsedLabel(startedAt: string | null) {
  if (!startedAt) return "Not started";
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
