import { describe, expect, it } from "vitest";

import {
  applySim3,
  composeSim3,
  defaultRegistration,
  identitySim3,
  isFiniteVec3,
  measurementRaycastTarget,
  metricMeasurementAllowed,
  sim3FromRowMajor4,
  sourceToWorld,
  sparkPiXFlipSim3,
  translationSim3,
  uniformScaleSim3,
  vec3,
  yawTranslationSim3,
} from "./s360-world";

describe("identitySim3", () => {
  it("leaves a point unchanged", () => {
    const p = vec3(1.5, -2, 8);
    expect(applySim3(identitySim3(), p)).toEqual(p);
  });
});

describe("sparkPiXFlipSim3", () => {
  it("is Rx(π): (x,y,z) → (x,-y,-z), matching Spark rotation={[Math.PI,0,0]}", () => {
    expect(applySim3(sparkPiXFlipSim3(), vec3(2, 3, 4))).toEqual(vec3(2, -3, -4));
  });

  it("is not applied by identity world registration", () => {
    const world = defaultRegistration("TSDF_MESH", "validated");
    expect(sourceToWorld(vec3(2, 3, 4), { sourceFrame: world.sourceFrame, toWorld: world.toWorld })).toEqual(
      vec3(2, 3, 4),
    );
  });
});

describe("uniformScaleSim3", () => {
  it("scales about the origin before rotation/translation", () => {
    const sim = composeSim3(uniformScaleSim3(2), translationSim3(1, 0, 0));
    expect(applySim3(sim, vec3(3, 0, 0))).toEqual(vec3(7, 0, 0));
  });
});

describe("rowMajor4ToColumnMajor", () => {
  it("round-trips a translation in the last column", () => {
    const sim = sim3FromRowMajor4(
      [
        [1, 0, 0, 4],
        [0, 1, 0, 5],
        [0, 0, 1, 6],
        [0, 0, 0, 1],
      ],
      1,
    );
    expect(applySim3(sim, vec3(0, 0, 0))).toEqual(vec3(4, 5, 6));
  });
});

describe("yawTranslationSim3", () => {
  it("rotates 90° about Y then translates", () => {
    const sim = yawTranslationSim3(Math.PI / 2, 10, 0, 0);
    const out = applySim3(sim, vec3(1, 2, 0));
    expect(out.x).toBeCloseTo(10, 8);
    expect(out.y).toBeCloseTo(2, 8);
    expect(out.z).toBeCloseTo(-1, 8);
  });
});

describe("sourceToWorld", () => {
  it("maps a monocular Gaussian through Sim(3) into S360_WORLD", () => {
    const pose = {
      sourceFrame: "COLMAP_OPENCV" as const,
      toWorld: composeSim3(uniformScaleSim3(0.5), translationSim3(0, 1, 0)),
    };
    expect(sourceToWorld(vec3(4, 0, 0), pose)).toEqual(vec3(2, 1, 0));
  });
});

describe("isFiniteVec3", () => {
  it("rejects NaN and incomplete objects", () => {
    expect(isFiniteVec3({ x: 1, y: 2, z: 3 })).toBe(true);
    expect(isFiniteVec3({ x: 1, y: NaN, z: 3 })).toBe(false);
    expect(isFiniteVec3({ x: 1, y: 2 })).toBe(false);
  });
});

describe("measurementRaycastTarget", () => {
  it("uses the metric mesh even when the Gaussian is the visible layer", () => {
    expect(measurementRaycastTarget(true)).toBe("metric-mesh");
  });

  it("does not fall back to Gaussian geometry", () => {
    expect(measurementRaycastTarget(false)).toBe("unavailable");
  });
});

describe("metricMeasurementAllowed", () => {
  it("allows picks on a present TSDF mesh", () => {
    expect(
      metricMeasurementAllowed({
        hasMetricMesh: true,
        meshRegistration: defaultRegistration("TSDF_MESH", "validated"),
      }),
    ).toBe(true);
  });

  it("refuses measurement when no metric mesh exists", () => {
    expect(
      metricMeasurementAllowed({
        hasMetricMesh: false,
        meshRegistration: defaultRegistration("SPARK_SPLAT_POST_PI_FLIP", "validated"),
      }),
    ).toBe(false);
  });
});
