import { describe, expect, it } from "vitest";
import { filterProcessingRows, mapJobStatus, planStage, workerProgress, type ProcessingRow } from "./processing-model";

const row = (partial: Partial<ProcessingRow>): ProcessingRow => ({
  id: "1",
  projectId: "p",
  projectName: "Harbor",
  source: "Room 4",
  kind: "Reality",
  stage: "train",
  status: "processing",
  statusLabel: "Processing",
  occurredAt: null,
  error: null,
  progressPct: null,
  output: null,
  ...partial,
});

describe("processing status", () => {
  it("uses backend statuses and does not invent a percentage", () => {
    expect(mapJobStatus("queued")).toBe("queued");
    expect(mapJobStatus("processing")).toBe("processing");
    expect(mapJobStatus("ready")).toBe("completed");
    expect(mapJobStatus("failed")).toBe("failed");
    expect(mapJobStatus("canceled")).toBeNull();
    expect(planStage("processing")).toBe("rasterizing");
    expect(workerProgress("47")).toBeNull();
    expect(workerProgress(40)).toBe(40);
  });

  it("filters by state and project text", () => {
    const rows = [row({}), row({ id: "2", status: "failed", projectName: "Annex", source: "Sheet A2", error: "Raster failed" })];
    expect(filterProcessingRows(rows, "failed", "").map((item) => item.id)).toEqual(["2"]);
    expect(filterProcessingRows(rows, "all", "harbor").map((item) => item.id)).toEqual(["1"]);
  });
});
