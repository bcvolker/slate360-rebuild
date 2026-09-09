import { describe, expect, it } from "vitest";

import type { HubTwin } from "@/lib/types/digital-twin-hub";
import {
  buildTwinProjectCards,
  dayLabel,
  defaultScanTitle,
  formatTwinWhen,
  groupTwinsByDay,
  matchesTwinListFilter,
  pickContinueTwin,
  resolveTwinHubState,
  UNFILED_PROJECT_KEY,
} from "./twin-hub-state";

const NOW = new Date("2026-09-09T20:00:00");

function twin(over: Partial<HubTwin> & { id: string }): HubTwin {
  return {
    title: over.id,
    status: "draft",
    statusChip: "DRAFT",
    projectId: null,
    projectName: null,
    updatedAt: "2026-09-09T18:00:00",
    readyModels: 0,
    hasCapture: true,
    hubState: "saved",
    hasPoster: false,
    ...over,
  };
}

describe("resolveTwinHubState", () => {
  const base = { spaceStatus: "draft", latestJobStatus: null, hasCapture: true, uploading: false, readyModels: 0 };
  it("orders ready > failed > processing > uploading > saved", () => {
    expect(resolveTwinHubState({ ...base, readyModels: 1 })).toBe("ready");
    expect(resolveTwinHubState({ ...base, latestJobStatus: "failed" })).toBe("failed");
    expect(resolveTwinHubState({ ...base, latestJobStatus: "queued" })).toBe("processing");
    expect(resolveTwinHubState({ ...base, uploading: true })).toBe("uploading");
    expect(resolveTwinHubState(base)).toBe("saved");
  });
  it("a ready model wins even when a later job failed", () => {
    expect(resolveTwinHubState({ ...base, readyModels: 1, latestJobStatus: "failed" })).toBe("ready");
  });
});

describe("matchesTwinListFilter", () => {
  it("Saved includes uploading; Ready is ready only", () => {
    expect(matchesTwinListFilter("uploading", "saved")).toBe(true);
    expect(matchesTwinListFilter("processing", "saved")).toBe(false);
    expect(matchesTwinListFilter("ready", "ready")).toBe(true);
    expect(matchesTwinListFilter("failed", "all")).toBe(true);
  });
});

describe("dates", () => {
  it("labels days relative to now", () => {
    expect(dayLabel(new Date("2026-09-09T01:00:00"), NOW)).toBe("Today");
    expect(dayLabel(new Date("2026-09-08T23:59:00"), NOW)).toBe("Yesterday");
    expect(dayLabel(new Date("2026-09-06T12:00:00"), NOW)).toBe("Sep 6");
    expect(dayLabel(new Date("2025-12-06T12:00:00"), NOW)).toBe("Dec 6, 2025");
    expect(formatTwinWhen("2026-09-09T19:24:00", NOW)).toBe("Today · 7:24 PM");
  });
  it("groups newest first by day", () => {
    const groups = groupTwinsByDay(
      [twin({ id: "a", updatedAt: "2026-09-06T10:00:00" }), twin({ id: "b", updatedAt: "2026-09-09T10:00:00" }), twin({ id: "c", updatedAt: "2026-09-09T12:00:00" })],
      NOW,
    );
    expect(groups.map((g) => g.label)).toEqual(["Today", "Sep 6"]);
    expect(groups[0].twins.map((t) => t.id)).toEqual(["c", "b"]);
  });
  it("builds the default scan name", () => {
    expect(defaultScanTitle("Smith Kitchen", new Date("2026-09-08T19:24:00"))).toBe("Smith Kitchen · Sep 8, 7:24 PM");
    expect(defaultScanTitle(null, new Date("2026-09-08T19:24:00"))).toBe("Quick Scan · Sep 8, 7:24 PM");
  });
});

describe("buildTwinProjectCards", () => {
  it("one card per project, unfiled included, newest first, poster from the newest ready twin", () => {
    const cards = buildTwinProjectCards([
      twin({ id: "q1", updatedAt: "2026-09-01T10:00:00" }),
      twin({ id: "p1", projectId: "P", projectName: "ASU 205", updatedAt: "2026-09-08T10:00:00", hasPoster: true }),
      twin({ id: "p2", projectId: "P", projectName: "ASU 205", updatedAt: "2026-09-07T10:00:00", hasPoster: true, hubState: "ready", readyModels: 1 }),
      twin({ id: "p3", projectId: "P", projectName: "ASU 205", updatedAt: "2026-09-09T10:00:00", hubState: "processing" }),
    ]);
    expect(cards.map((c) => c.key)).toEqual(["P", UNFILED_PROJECT_KEY]);
    expect(cards[0]).toMatchObject({ name: "ASU 205", count: 3, readyCount: 1, busy: true, posterTwinId: "p2", latestAt: "2026-09-09T10:00:00" });
    expect(cards[1]).toMatchObject({ name: "Quick Scans · unfiled", count: 1, posterTwinId: null });
  });
});

describe("pickContinueTwin", () => {
  it("prefers uploading, then processing, then saved; ignores ready", () => {
    expect(
      pickContinueTwin([
        twin({ id: "r", hubState: "ready", readyModels: 1 }),
        twin({ id: "s", hubState: "saved", updatedAt: "2026-09-09T19:00:00" }),
        twin({ id: "u", hubState: "uploading", updatedAt: "2026-09-01T00:00:00" }),
      ])?.id,
    ).toBe("u");
    expect(pickContinueTwin([twin({ id: "r", hubState: "ready", readyModels: 1 })])).toBeNull();
  });
});
