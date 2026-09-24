import { describe, expect, it } from "vitest";
import { assembleProjectHistory, type HistoryBuildInput } from "./assemble-history";
import { isClientHistorySession, siteWalkOccurredAt, thermalOccurredAt, twinOccurredAt } from "./history-rules";

const PROJECT = "p1";

function input(partial: Partial<HistoryBuildInput> = {}): HistoryBuildInput {
  return {
    projectId: PROJECT,
    exploreBase: "/vnext/projects/p1/explore",
    itemsBase: "/vnext/projects/p1/items",
    sessions: [],
    items: [],
    spaces: [],
    captures: [],
    models: [],
    thermals: [],
    sheets: [],
    sessionLinks: [],
    pins: [],
    ...partial,
  };
}

describe("history dates and eligibility", () => {
  it("uses the site walk completion time, never a later update", () => {
    expect(
      siteWalkOccurredAt({
        completedAt: "2026-09-01T12:00:00.000Z",
        startedAt: "2026-09-01T08:00:00.000Z",
        createdOfflineAt: null,
        createdAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toBe("2026-09-01T12:00:00.000Z");
    expect(isClientHistorySession("completed")).toBe(true);
    expect(isClientHistorySession("signed")).toBe(true);
    expect(isClientHistorySession("draft")).toBe(false);
  });

  it("uses the capture upload time rather than the model created time", () => {
    expect(twinOccurredAt({ uploadedAt: "2026-09-02T10:00:00.000Z", createdAt: "2026-09-01T10:00:00.000Z" }, "2026-09-09T10:00:00.000Z")).toBe(
      "2026-09-02T10:00:00.000Z",
    );
  });

  it("uses the thermal capture time rather than a later session timestamp", () => {
    expect(thermalOccurredAt("2026-09-03T10:00:00.000Z", "2026-09-20T10:00:00.000Z")).toBe("2026-09-03T10:00:00.000Z");
  });
});

describe("assembleProjectHistory", () => {
  const space = { id: "space-1", projectId: PROJECT, archived: false, deleted: false };

  it("keeps same-day records separate unless a foreign key joins them", () => {
    const visits = assembleProjectHistory(
      input({
        sessions: [
          {
            id: "s1",
            projectId: PROJECT,
            title: "Walk",
            status: "completed",
            completedAt: "2026-09-18T15:00:00.000Z",
            startedAt: null,
            createdOfflineAt: null,
            createdAt: "2026-09-01T00:00:00.000Z",
          },
        ],
        spaces: [space],
        captures: [
          { id: "c1", projectId: PROJECT, title: "Scan", uploadedAt: "2026-09-18T16:00:00.000Z", createdAt: null, deleted: false },
        ],
        models: [
          {
            id: "m1",
            spaceId: "space-1",
            captureId: "c1",
            format: "spz",
            storageKey: "a.spz",
            title: "Scan",
            status: "ready",
            deleted: false,
            createdAt: "2026-09-20T00:00:00.000Z",
            hasPreview: true,
            georeferenceStatus: null,
          },
        ],
        thermals: [
          {
            id: "t1",
            projectId: PROJECT,
            name: "Ceiling",
            createdAt: "2026-09-18T18:00:00.000Z",
            deleted: false,
            available: true,
            earliestCaptureAt: "2026-09-18T17:00:00.000Z",
          },
        ],
      }),
    );
    expect(visits.map((entry) => entry.id)).toEqual(["thermal-t1", "capture-c1", "session-s1"]);
    expect(visits.find((entry) => entry.id === "capture-c1")?.occurredAt).toBe("2026-09-18T16:00:00.000Z");
    expect(visits.find((entry) => entry.id === "thermal-t1")?.occurredAt).toBe("2026-09-18T17:00:00.000Z");
    expect(visits.find((entry) => entry.id === "session-s1")?.dateLabel).toBe("Sep 18, 2026");
  });

  it("drops drafts, other projects, deleted models, archived spaces, and unavailable thermal", () => {
    const visits = assembleProjectHistory(
      input({
        sessions: [
          {
            id: "draft",
            projectId: PROJECT,
            title: "Draft",
            status: "in_progress",
            completedAt: "2026-09-01T00:00:00.000Z",
            startedAt: null,
            createdOfflineAt: null,
            createdAt: null,
          },
          {
            id: "other",
            projectId: "p2",
            title: "Other",
            status: "completed",
            completedAt: "2026-09-02T00:00:00.000Z",
            startedAt: null,
            createdOfflineAt: null,
            createdAt: null,
          },
        ],
        spaces: [space, { id: "archived", projectId: PROJECT, archived: true, deleted: false }],
        models: [
          {
            id: "gone",
            spaceId: "space-1",
            captureId: null,
            format: "spz",
            storageKey: "gone.spz",
            title: null,
            status: "ready",
            deleted: true,
            createdAt: "2026-09-01T00:00:00.000Z",
            hasPreview: true,
            georeferenceStatus: "VERIFIED",
          },
          {
            id: "old-space",
            spaceId: "archived",
            captureId: null,
            format: "spz",
            storageKey: "old.spz",
            title: null,
            status: "ready",
            deleted: false,
            createdAt: "2026-09-01T00:00:00.000Z",
            hasPreview: true,
            georeferenceStatus: "VERIFIED",
          },
          {
            id: "drone",
            spaceId: "space-1",
            captureId: null,
            format: "ply",
            storageKey: "cloud.ply",
            title: "Drone",
            status: "ready",
            deleted: false,
            createdAt: "2026-09-01T00:00:00.000Z",
            hasPreview: true,
            georeferenceStatus: null,
          },
        ],
        thermals: [
          {
            id: "revoked",
            projectId: PROJECT,
            name: "Revoked",
            createdAt: "2026-09-01T00:00:00.000Z",
            deleted: false,
            available: false,
            earliestCaptureAt: "2026-09-01T00:00:00.000Z",
          },
        ],
      }),
    );
    expect(visits).toEqual([]);
  });

  it("merges splat and geometry only when they share a capture, and keeps the visit thumbnail on that capture", () => {
    const visits = assembleProjectHistory(
      input({
        spaces: [space],
        captures: [{ id: "c1", projectId: PROJECT, title: "Scan", uploadedAt: "2026-09-01T00:00:00.000Z", createdAt: null, deleted: false }],
        models: [
          {
            id: "splat",
            spaceId: "space-1",
            captureId: "c1",
            format: "spz",
            storageKey: "a.spz",
            title: "Scan",
            status: "ready",
            deleted: false,
            createdAt: "2026-09-09T00:00:00.000Z",
            hasPreview: true,
            georeferenceStatus: "VERIFIED",
          },
          {
            id: "mesh",
            spaceId: "space-1",
            captureId: "c1",
            format: "glb",
            storageKey: "a.glb",
            title: "Mesh",
            status: "ready",
            deleted: false,
            createdAt: "2026-09-09T00:00:00.000Z",
            hasPreview: true,
            georeferenceStatus: null,
          },
          {
            id: "other-day",
            spaceId: "space-1",
            captureId: null,
            format: "spz",
            storageKey: "b.spz",
            title: "Later",
            status: "processing",
            deleted: false,
            createdAt: "2026-09-01T00:00:00.000Z",
            hasPreview: true,
            georeferenceStatus: "VERIFIED",
          },
        ],
      }),
    );
    expect(visits).toHaveLength(1);
    expect(visits[0].id).toBe("capture-c1");
    expect(visits[0].sources.map((source) => source.rep).sort()).toEqual(["geometry", "reality"]);
    expect(visits[0].thumbnailHref).toContain("/twin-models/splat/preview-image");
    expect(visits[0].thumbnailHref).not.toContain("other-day");
    expect(visits[0].frame).toEqual({ spaceId: "space-1", modelId: "splat", georeferenceStatus: "VERIFIED" });
  });

  it("attaches a plan sheet and items only through the session, and does not invent documents", () => {
    const visits = assembleProjectHistory(
      input({
        sessions: [
          {
            id: "s1",
            projectId: PROJECT,
            title: "Walk",
            status: "signed",
            completedAt: null,
            startedAt: "2026-09-01T08:00:00.000Z",
            createdOfflineAt: null,
            createdAt: null,
          },
        ],
        items: [
          {
            id: "item-1",
            projectId: PROJECT,
            sessionId: "s1",
            itemType: "photo",
            title: "Stain",
            capturedAt: "2026-09-01T08:10:00.000Z",
            deleted: false,
          },
          {
            id: "other-item",
            projectId: PROJECT,
            sessionId: "s2",
            itemType: "photo",
            title: "Elsewhere",
            capturedAt: "2026-09-01T08:10:00.000Z",
            deleted: false,
          },
        ],
        sheets: [
          { id: "sheet-1", projectId: PROJECT, planSetId: "set-1", label: "A2.12 Level 2", revisionLabel: "Rev 2", renderable: true },
          { id: "sheet-2", projectId: "p2", planSetId: "set-2", label: "Other", revisionLabel: null, renderable: true },
        ],
        sessionLinks: [
          { sessionId: "s1", planSheetId: "sheet-1" },
          { sessionId: "s1", planSheetId: "sheet-2" },
        ],
        pins: [],
      }),
    );
    expect(visits[0].plans.map((plan) => plan.sheetLabel)).toEqual(["A2.12 Level 2"]);
    expect(visits[0].plans[0].revisionLabel).toBe("Rev 2");
    expect(visits[0].items.map((item) => item.id)).toEqual(["item-1"]);
    expect(visits[0]).not.toHaveProperty("documentCount");
  });
});
