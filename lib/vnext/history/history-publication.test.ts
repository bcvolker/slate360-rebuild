import { describe, expect, it } from "vitest";
import { assembleProjectHistory, type HistoryBuildInput } from "./assemble-history";
import { twinModelIsClientPublished } from "./history-rules";

const PROJECT = "p1";

function input(partial: Partial<HistoryBuildInput>): HistoryBuildInput {
  return {
    projectId: PROJECT,
    exploreBase: "/vnext/projects/p1/explore",
    itemsBase: "/vnext/projects/p1/items",
    sessions: [],
    items: [],
    spaces: [{ id: "space-1", projectId: PROJECT, archived: false, deleted: false }],
    captures: [],
    models: [],
    thermals: [],
    sheets: [],
    sessionLinks: [],
    pins: [],
    ...partial,
  };
}

describe("published history sources", () => {
  it("keeps two published reality scans, and drops one only after that scan is unpublished", () => {
    const model = (id: string, captureId: string) => ({
      id,
      spaceId: "space-1",
      captureId,
      format: "spz",
      storageKey: `${id}.spz`,
      title: id,
      status: "ready",
      deleted: false,
      createdAt: "2026-09-01T00:00:00.000Z",
      hasPreview: false,
      georeferenceStatus: null,
    });
    const capture = (id: string) => ({
      id,
      projectId: PROJECT,
      title: id,
      uploadedAt: "2026-09-01T00:00:00.000Z",
      createdAt: null,
      deleted: false,
    });
    const scans = [model("scan-a", "c-a"), model("scan-b", "c-b")];
    const both = assembleProjectHistory(input({
      captures: [capture("c-a"), capture("c-b")],
      models: scans.filter((item) => twinModelIsClientPublished(item, new Set(["scan-a", "scan-b"]), new Set())),
    }));
    expect(both.map((visit) => visit.sources[0]?.sourceId).sort()).toEqual(["scan-a", "scan-b"]);
    const afterUnpublish = assembleProjectHistory(input({
      captures: [capture("c-a"), capture("c-b")],
      models: scans.filter((item) => twinModelIsClientPublished(item, new Set(["scan-b"]), new Set())),
    }));
    expect(afterUnpublish.map((visit) => visit.sources[0]?.sourceId)).toEqual(["scan-b"]);
  });
});
