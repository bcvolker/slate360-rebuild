import type { PortfolioRecord } from "./portfolio-types";

export function normalizePortfolioQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function filterPortfolioRecords(records: PortfolioRecord[], query: string): PortfolioRecord[] {
  const needle = normalizePortfolioQuery(query);
  if (!needle) return records;
  return records.filter((record) => {
    const haystack = [record.name, record.context, record.locationLabel]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function sortPortfolioRecords(records: PortfolioRecord[]): PortfolioRecord[] {
  return [...records].sort((left, right) => {
    const leftTime = left.documentedAt ? Date.parse(left.documentedAt) : Number.NEGATIVE_INFINITY;
    const rightTime = right.documentedAt ? Date.parse(right.documentedAt) : Number.NEGATIVE_INFINITY;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return left.name.localeCompare(right.name);
  });
}
