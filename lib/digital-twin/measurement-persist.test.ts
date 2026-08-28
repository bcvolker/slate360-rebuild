import { describe, expect, it } from "vitest";

import {
  deserializeMeasurement,
  serializeMeasurementMetadata,
  toApiInsertBody,
} from "./measurement-persist";
import { vec3 } from "./s360-world";

describe("measurement persist", () => {
  it("round-trips polyline points through metadata, not just endpoints", () => {
    const points = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 0, 2)];
    const meta = serializeMeasurementMetadata({
      id: "a",
      kind: "polyline",
      points,
      value: 3,
      unit: "m",
      label: "run",
      hidden: false,
      scope: "epoch",
      epochId: "epoch-1",
      spaceId: "space",
      modelId: "model",
      sourceMetricAssetId: "mesh-1",
      source: "metric-mesh",
      createdAt: "2026-08-27T00:00:00.000Z",
      updatedAt: "2026-08-27T00:00:00.000Z",
      createdBy: "user",
    });
    const restored = deserializeMeasurement({
      id: "a",
      label: "run",
      start_point: points[0],
      end_point: points[2],
      measured_value: 3,
      unit: "m",
      metadata: meta,
      created_at: "2026-08-27T00:00:00.000Z",
      space_id: "space",
      model_id: "model",
    });
    expect(restored?.kind).toBe("polyline");
    expect(restored?.points).toEqual(points);
    expect(restored?.scope).toBe("epoch");
    expect(restored?.source).toBe("metric-mesh");
  });

  it("falls back to start/end for legacy 2-point rows", () => {
    const restored = deserializeMeasurement({
      id: "legacy",
      start_point: vec3(0, 0, 0),
      end_point: vec3(0, 0, 2),
      measured_value: 2,
      unit: "ft",
    });
    expect(restored?.kind).toBe("distance");
    expect(restored?.points).toHaveLength(2);
    expect(restored?.unit).toBe("ft");
  });

  it("writes schema-compatible start/end for the existing measurements API", () => {
    const body = toApiInsertBody({
      kind: "area",
      points: [vec3(0, 0, 0), vec3(2, 0, 0), vec3(2, 0, 2), vec3(0, 0, 2)],
      value: 4,
      unit: "m",
      label: "room",
      hidden: false,
      scope: "project",
      epochId: null,
      spaceId: "s",
      modelId: "m",
      sourceMetricAssetId: "mesh",
      source: "metric-mesh",
      createdBy: null,
    });
    expect(body.start_point).toEqual(vec3(0, 0, 0));
    expect(body.end_point).toEqual(vec3(0, 0, 2));
    expect(body.metadata.kind).toBe("area");
    expect(body.metadata.points).toHaveLength(4);
  });
});
