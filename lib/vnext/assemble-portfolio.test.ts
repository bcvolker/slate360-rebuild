import { describe, expect, it } from "vitest";
import { assemblePortfolioRecords } from "./assemble-portfolio";
import { filterPortfolioRecords, sortPortfolioRecords } from "./filter-portfolio";
import type { PortfolioEvidence, PortfolioProjectRow } from "./portfolio-types";

const row = (id: string, name: string, status = "active"): PortfolioProjectRow => ({
  id,
  name,
  description: null,
  metadata: null,
  status,
  created_at: "2026-01-01T00:00:00.000Z",
});

const evidence = (partial: Partial<PortfolioEvidence>): PortfolioEvidence => ({
  realityPreviewUrl: null,
  pano360Url: null,
  droneUrl: null,
  planUrl: null,
  timestamps: [],
  representations: [],
  ...partial,
});

describe("assemblePortfolioRecords", () => {
  it("only emits scoped project ids", () => {
    const records = assemblePortfolioRecords({
      scopedProjects: [row("a", "Alpha")],
      extrasById: {
        a: {
          thumbnailUrl: null,
          clientName: "Northwater",
          address: null,
          location: null,
          latitude: null,
          longitude: null,
          isArchived: false,
          city: "Portland",
          state: "ME",
          region: null,
        },
        leaked: {
          thumbnailUrl: "https://cdn.example/leaked.jpg",
          clientName: "Should not appear",
          address: null,
          location: null,
          latitude: null,
          longitude: null,
          isArchived: false,
          city: null,
          state: null,
          region: null,
        },
      },
      evidenceById: {
        a: evidence({ representations: ["plan"], timestamps: ["2026-09-14T00:00:00.000Z"] }),
        leaked: evidence({ realityPreviewUrl: "https://cdn.example/secret.jpg", representations: ["reality"] }),
      },
    });

    expect(records.map((item) => item.id)).toEqual(["a"]);
    expect(records[0]?.href).toBe("/vnext/projects/a");
    expect(records[0]?.context).toBe("Northwater");
    expect(records[0]?.representations).toEqual(["plan"]);
    expect(records[0]?.hero.kind).not.toBe("reality");
  });

  it("hides archived projects and skips invalid hero URLs", () => {
    const records = assemblePortfolioRecords({
      scopedProjects: [row("a", "Hidden", "archived"), row("b", "Visible")],
      extrasById: {
        b: {
          thumbnailUrl: "javascript:alert(1)",
          clientName: null,
          address: null,
          location: "Boise, ID",
          latitude: null,
          longitude: null,
          isArchived: false,
          city: null,
          state: null,
          region: null,
        },
      },
      evidenceById: {
        b: evidence({ representations: ["360"] }),
      },
    });

    expect(records.map((item) => item.id)).toEqual(["b"]);
    expect(records[0]?.hero).toEqual({ kind: "neutral", url: null });
    expect(records[0]?.locationLabel).toBe("Boise, ID");
  });
});

describe("filterPortfolioRecords", () => {
  const records = assemblePortfolioRecords({
    scopedProjects: [row("a", "Harbor Street Residence"), row("b", "Cedar Mill Clinic")],
    extrasById: {
      a: {
        thumbnailUrl: null,
        clientName: "Northwater Construction",
        address: null,
        location: "Portland, ME",
        latitude: null,
        longitude: null,
        isArchived: false,
        city: null,
        state: null,
        region: null,
      },
    },
    evidenceById: {},
  });

  it("matches name, client, and location", () => {
    expect(filterPortfolioRecords(records, "harbor").map((item) => item.id)).toEqual(["a"]);
    expect(filterPortfolioRecords(records, "northwater").map((item) => item.id)).toEqual(["a"]);
    expect(filterPortfolioRecords(records, "portland").map((item) => item.id)).toEqual(["a"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterPortfolioRecords(records, "zzzz-no-match")).toEqual([]);
  });
});

describe("sortPortfolioRecords", () => {
  it("orders by latest documented date then name", () => {
    const sorted = sortPortfolioRecords([
      { ...recordsFixture("b", "Beta"), documentedAt: "2026-01-01T00:00:00.000Z" },
      { ...recordsFixture("a", "Alpha"), documentedAt: "2026-08-01T00:00:00.000Z" },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

function recordsFixture(id: string, name: string) {
  return {
    id,
    href: `/vnext/projects/${id}`,
    name,
    context: null,
    locationLabel: null,
    documentedLabel: null,
    documentedAt: null,
    representations: [],
    hero: { kind: "neutral" as const, url: null },
  };
}
