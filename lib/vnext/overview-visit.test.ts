import { describe, expect, it } from "vitest";
import { formatPlainDate, pickLatestVisit } from "./overview-visit";

describe("pickLatestVisit", () => {
  it("returns null when there are no dated candidates", () => {
    expect(pickLatestVisit([])).toBeNull();
    expect(pickLatestVisit([{ iso: null, sourceLabel: "Site walk visit" }])).toBeNull();
    expect(pickLatestVisit([{ iso: "not-a-date", sourceLabel: "Site walk visit" }])).toBeNull();
  });

  it("picks the most recent candidate across sources", () => {
    const result = pickLatestVisit([
      { iso: "2026-01-01T00:00:00.000Z", sourceLabel: "Site walk visit" },
      { iso: "2026-06-15T00:00:00.000Z", sourceLabel: "Digital twin capture" },
      { iso: "2026-03-01T00:00:00.000Z", sourceLabel: "Thermal session" },
    ]);
    expect(result).toEqual({ occurredAt: "2026-06-15T00:00:00.000Z", sourceLabel: "Digital twin capture" });
  });

  it("ignores invalid entries and keeps the best valid one", () => {
    const result = pickLatestVisit([
      { iso: undefined, sourceLabel: "Site walk visit" },
      { iso: "garbage", sourceLabel: "Digital twin capture" },
      { iso: "2026-02-02T00:00:00.000Z", sourceLabel: "Thermal session" },
    ]);
    expect(result).toEqual({ occurredAt: "2026-02-02T00:00:00.000Z", sourceLabel: "Thermal session" });
  });
});

describe("formatPlainDate", () => {
  it("returns null for missing or invalid input", () => {
    expect(formatPlainDate(null)).toBeNull();
    expect(formatPlainDate(undefined)).toBeNull();
    expect(formatPlainDate("not-a-date")).toBeNull();
  });

  it("formats a valid ISO date in UTC", () => {
    expect(formatPlainDate("2026-09-14T15:00:00.000Z")).toBe("Sep 14, 2026");
  });
});
