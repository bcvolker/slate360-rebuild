import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  BRUSH_B_PRIMITIVE_COUNT,
  MOBILE_LOD_SPLAT_COUNT,
  SPARK_APPEARANCE_BLUR,
  sparkRendererAppearanceArgs,
  sparkSplatAppearanceArgs,
} from "./spark-appearance-load";

const PRODUCTION = [
  "components/digital-twin/MeshSplatLayer.tsx",
  "components/digital-twin/splat-viewer-scene.tsx",
  "components/digital-twin/desktop/DesktopSplatViewport.tsx",
];

describe("spark appearance load", () => {
  it("does not rebuild PackedSplats with extractSplats", () => {
    for (const file of PRODUCTION) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/extractSplats/);
    }
  });

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
    expect(readFileSync("components/digital-twin/MeshSplatLayer.tsx", "utf8")).toMatch(
      /sparkRendererAppearanceArgs/,
    );
  });
});
