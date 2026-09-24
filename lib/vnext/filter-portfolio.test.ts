import { describe, expect, it } from "vitest";
import { PREVIEW_PORTFOLIO_RECORDS } from "./preview-portfolio-fixtures";
import { filterPortfolioRecords, sortPortfolioRecords } from "./filter-portfolio";

describe("filterPortfolioRecords", () => {
  it("matches name, location, and client context", () => {
    expect(filterPortfolioRecords(PREVIEW_PORTFOLIO_RECORDS, "Harbor")).toHaveLength(1);
    expect(filterPortfolioRecords(PREVIEW_PORTFOLIO_RECORDS, "Boise")[0]?.name).toBe("Stone Court");
    expect(filterPortfolioRecords(PREVIEW_PORTFOLIO_RECORDS, "Northwater")[0]?.name).toBe(
      "Harbor Street Residence",
    );
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterPortfolioRecords(PREVIEW_PORTFOLIO_RECORDS, "zzzz-no-match")).toEqual([]);
  });
});

describe("sortPortfolioRecords", () => {
  it("orders by latest documented date, then name", () => {
    const names = sortPortfolioRecords(PREVIEW_PORTFOLIO_RECORDS).map((record) => record.name);
    expect(names[0]).toBe("Harbor Street Residence");
    expect(names.at(-1)).toBe("Stone Court");
  });
});
