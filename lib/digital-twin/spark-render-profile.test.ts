import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  profileForScene,
  resolveSparkRenderProfile,
  SPARK_DEFAULT_PROFILE,
  SPIRULA_3DGUT_PROFILE,
  sparkRendererArgsFor,
} from "./spark-render-profile";

const VERIFIED = "fd1afca1c47f89c98c8e64929f1c73b82571e5f3";

describe("resolveSparkRenderProfile", () => {
  it("selects the Spirula 3dgut profile only from explicit, verified provenance", () => {
    expect(resolveSparkRenderProfile({ training_rasterizer: { trainer: "spirula", trainer_revision: VERIFIED, primitive: "3dgut" } }).id)
      .toBe("spirula-3dgut");
    // the hardened worker's patched build id shares the verified renderer
    expect(resolveSparkRenderProfile({
      training_rasterizer: { trainer: "spirula", trainer_revision: `${VERIFIED}+resume-nsh-2f6a873bb639`, primitive: "3dgut", screen_blur_px2: 0 },
    }).id).toBe("spirula-3dgut");
  });

  it("never applies zero blur without that provenance", () => {
    for (const manifest of [
      null,
      undefined,
      {},
      { training_rasterizer: { trainer: "spirula", trainer_revision: VERIFIED, primitive: "3dgs" } },
      { training_rasterizer: { trainer: "spirula", trainer_revision: "e6d38a2a900bb1eddc73c68051cc625e88809c5f", primitive: "3dgut" } },
      { training_rasterizer: { trainer: "spirula", primitive: "3dgut" } },
      { training_rasterizer: { trainer: "splatfacto", trainer_revision: VERIFIED, primitive: "3dgut" } },
      { training_rasterizer: { trainer: "spirula", trainer_revision: VERIFIED, primitive: "3dgut", screen_blur_px2: 0.3 } },
    ]) {
      expect(resolveSparkRenderProfile(manifest)).toBe(SPARK_DEFAULT_PROFILE);
    }
  });

  it("keeps a scene-wide renderer on defaults when its models disagree", () => {
    expect(profileForScene([SPIRULA_3DGUT_PROFILE, SPIRULA_3DGUT_PROFILE])).toBe(SPIRULA_3DGUT_PROFILE);
    expect(profileForScene([SPIRULA_3DGUT_PROFILE, SPARK_DEFAULT_PROFILE])).toBe(SPARK_DEFAULT_PROFILE);
  });

  it("passes accumulator storage and both blur terms to the renderer explicitly", () => {
    const a = sparkRendererArgsFor("gl", SPIRULA_3DGUT_PROFILE, { lodSplatCount: 400_000 });
    expect(a).toMatchObject({ accumExtSplats: true, blurAmount: 0, preBlurAmount: 0, lodSplatCount: 400_000 });
    const d = sparkRendererArgsFor("gl", SPARK_DEFAULT_PROFILE);
    expect(d).toMatchObject({ accumExtSplats: false, blurAmount: 0.3, preBlurAmount: 0 });
    expect("lodSplatCount" in d).toBe(false);
    expect(d.enableLod).toBe(true);
    // the walk/dollhouse viewer turns LoD off (it needs the full ExtSplats for bounds, walk and raycast)
    expect(sparkRendererArgsFor("gl", SPIRULA_3DGUT_PROFILE, { enableLod: false })).toMatchObject({
      enableLod: false,
      accumExtSplats: true,
      blurAmount: 0,
    });
  });

  it("every Spark viewer builds its renderer from the resolved profile and remounts it per profile", () => {
    for (const file of [
      // this preview branch wires the profile into the walk/dollhouse viewer only
      "components/digital-twin/splat-viewer-scene.tsx",
    ]) {
      const src = readFileSync(file, "utf8");
      expect(src, file).toMatch(/resolveSparkRenderProfile\(/);
      expect(src, file).toMatch(/<sparkRenderer[\s\S]{0,80}key=\{`\$\{/);
      expect(src, file).not.toMatch(/<sparkRenderer args=\{\[\{ renderer/);
    }
  });
});
