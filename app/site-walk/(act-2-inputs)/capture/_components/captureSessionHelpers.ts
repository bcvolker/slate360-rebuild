export function parseRecentLocations(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function nextStopLabel(currentLocation: string, recentLocations: string[]) {
  const candidates = [currentLocation, ...recentLocations];
  const maxStop = candidates.reduce((max, label) => {
    const match = label.trim().match(/^stop\s+(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1);
  return `Stop ${maxStop + 1}`;
}

export function findGhostImageUrl(items: { id: string; title: string; item_type: string; local_preview_url?: string | null }[], activeItemId: string | null, location: string) {
  const prefix = location.trim();
  return items.find((item) => item.id !== activeItemId && item.item_type === "photo" && item.title.startsWith(prefix) && item.local_preview_url)?.local_preview_url ?? null;
}
