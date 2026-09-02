import { describe, expect, it } from "vitest";

import { reducePathStations, stationLabel, stationsAround } from "./path-stations";
import type { WaypointRecord } from "./types";

function wp(id: string, t: number, label: string): WaypointRecord {
  return {
    id, clipId: "c1", tSeconds: t, label, zone: null, yawDeg: 0, pitchDeg: 0, sortOrder: t, thumbnailKey: null, isVisible: true,
  };
}

describe("path stations", () => {
  it("reduces 11 waypoints to first, turns, and temporal spacing", () => {
    const many = [
      wp("a", 0, "Entry"),
      wp("b", 2, "Step"),
      wp("c", 4, "Step"),
      wp("d", 8, "Hall"),
      wp("e", 10, "Step"),
      wp("f", 17, "Door"),
      wp("g", 20, "Step"),
      wp("h", 28, "Kitchen"),
      wp("i", 32, "Step"),
      wp("j", 40, "Turn"),
      wp("k", 51, "End"),
    ];
    const stations = reducePathStations(many, "c1");
    expect(stations[0].label).toBe("Entry");
    expect(stations[stations.length - 1].label).toBe("End");
    expect(stations.length).toBeLessThanOrEqual(5);
    expect(stations.some((s) => s.label === "Hall")).toBe(true);
  });

  it("ranks stations ahead and behind the playhead", () => {
    const stations = [wp("a", 0, "Entry"), wp("d", 17, "Hall"), wp("k", 51, "End")];
    const around = stationsAround(stations, 10);
    expect(around[0].label).toBe("Hall");
    expect(stationLabel(around[0])).toContain("0:17");
  });
});
