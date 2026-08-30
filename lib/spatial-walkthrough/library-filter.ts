export type LibraryFilterable = {
  title: string;
  captured_at: string | null;
  building: string | null;
  floor: string | null;
  zone: string | null;
  walkthrough_type: string | null;
};

export type LibraryFilters = {
  q: string;
  building: string;
  floor: string;
  zone: string;
  type: string;
  elevation: "" | "ground" | "aerial";
  dateFrom: string;
  dateTo: string;
};

export const EMPTY_LIBRARY_FILTERS: LibraryFilters = {
  q: "",
  building: "",
  floor: "",
  zone: "",
  type: "",
  elevation: "",
  dateFrom: "",
  dateTo: "",
};

export function walkthroughElevation(type: string | null | undefined): "ground" | "aerial" | "mixed" {
  const t = (type ?? "").toLowerCase();
  if (t === "aerial") return "aerial";
  if (t === "mixed") return "mixed";
  return "ground";
}

export function matchesLibraryFilters(item: LibraryFilterable, filters: LibraryFilters): boolean {
  if (filters.q && !item.title.toLowerCase().includes(filters.q.toLowerCase())) return false;
  if (filters.building && (item.building ?? "").toLowerCase() !== filters.building.toLowerCase()) return false;
  if (filters.floor && (item.floor ?? "").toLowerCase() !== filters.floor.toLowerCase()) return false;
  if (filters.zone && (item.zone ?? "").toLowerCase() !== filters.zone.toLowerCase()) return false;
  if (filters.type && (item.walkthrough_type ?? "").toLowerCase() !== filters.type.toLowerCase()) return false;
  if (filters.elevation) {
    const elev = walkthroughElevation(item.walkthrough_type);
    if (filters.elevation === "aerial" && elev !== "aerial") return false;
    if (filters.elevation === "ground" && elev === "aerial") return false;
  }
  if (filters.dateFrom || filters.dateTo) {
    if (!item.captured_at) return false;
    const day = item.captured_at.slice(0, 10);
    if (filters.dateFrom && day < filters.dateFrom) return false;
    if (filters.dateTo && day > filters.dateTo) return false;
  }
  return true;
}

export function emptyLibraryFilter(): LibraryFilters {
  return { ...EMPTY_LIBRARY_FILTERS };
}

export function filterWalkthroughCards<T extends LibraryFilterable>(items: T[], filters: LibraryFilters): T[] {
  return items.filter((item) => matchesLibraryFilters(item, filters));
}

export function uniqueLibraryValues(items: Array<string | null | undefined>): string[] {
  return [...new Set(items.filter((v): v is string => Boolean(v)))];
}

export type LibraryFilter = LibraryFilters;

export type LibraryCard = LibraryFilterable & {
  id: string;
  status: string;
  duration_s: number | null;
  waypointCount: number;
  pinCount: number;
  shareStatus?: string;
};

export function uniqueField<T extends LibraryFilterable>(
  items: T[],
  key: "title" | "captured_at" | "building" | "floor" | "zone" | "walkthrough_type",
): string[] {
  return uniqueLibraryValues(items.map((item) => item[key]));
}
