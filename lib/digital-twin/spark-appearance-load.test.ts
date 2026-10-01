import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  BRUSH_B_PRIMITIVE_COUNT,
  MOBILE_LOD_SPLAT_COUNT,
  SPARK_APPEARANCE_BLUR,
  sparkRendererAppearanceArgs,
  sparkSplatAppearanceArgs,
} from "./spark-appearance-load";

// Scope: this module's own load/appearance helpers. The production viewers
// (MeshSplatLayer, splat-viewer-scene) follow main's memory-cap policy and are
// not asserted here.
describe("spark appearance load", () => {
  it("uses Spark-native LOD flags for appearance", () => {
    const args = sparkRendererAppearanceArgs({}, BRUSH_B_PRIMITIVE_COUNT);
    expect(args.enableLod).toBe(true);
    expect(args.blurAmount).toBe(SPARK_APPEARANCE_BLUR);
    expect(args.lodSplatCount).toBe(BRUSH_B_PRIMITIVE_COUNT);
    const splat = sparkSplatAppearanceArgs("x.spz", () => undefined);
    expect(splat.lod).toBe(true);
    expect(splat.enableLod).toBe(true);
    expect(splat.extSplats).toBe(true);
    expect(splat.nonLod).toBe(true);
    expect(MOBILE_LOD_SPLAT_COUNT).toBeGreaterThan(0);
  });

  it("never treats maxSplats or a short timeout as a loaded splat count", () => {
    const src = readFileSync("lib/digital-twin/spark-appearance-load.ts", "utf8");
    expect(src).not.toMatch(/packed\?\.maxSplats/);
    expect(src).not.toMatch(/setTimeout\(resolve, 400\)/);
    expect(src).toMatch(/still_loading/);
    expect(src).toMatch(/splatCountFromMesh/);
  });
});
