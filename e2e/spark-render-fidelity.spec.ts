import { expect, test } from "@playwright/test";

/**
 * Splat colour fidelity through the REAL shared viewer (SplatViewerCore → SplatViewerScene → SparkRenderer).
 *
 * Fixture (/preview/spark-fidelity-fixture): two stacked layers of semi-transparent (α 0.35) Gaussians with
 * colour 1.8 — the kind of above-one splat colour trained models contain. Composited over the canvas:
 *   colour kept (ext accumulator):     ≥ 1.0  → 255
 *   colour clamped to 1 (packed path): 1 − 0.65² ≈ 0.58 → ≈ 148
 * With the verified Spirula provenance in the manifest the viewer must select the spirula-3dgut profile and
 * keep the colour; without provenance it must stay on Spark's defaults (unchanged behaviour for every other
 * model). The profile is read from the live renderer (dev-only probe window.__slateSplatDebug), not from
 * constructor arguments.
 *
 * Needs WebGL2 (SwiftShader is enough). Run against a dev server:
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3213 PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test e2e/spark-render-fidelity.spec.ts --project=desktop-chromium
 */

type Probe = {
  effective: {
    profileId: string;
    accumExtSplats: boolean;
    displayAccumulatorExt: boolean | null;
    uniform_blurAmount: number;
    uniform_preBlurAmount: number;
    activeSplats: number | null;
  } | null;
  px: number[];
};

async function probe(page: import("@playwright/test").Page, provenance: "on" | "off"): Promise<Probe> {
  await page.goto(`/preview/spark-fidelity-fixture?provenance=${provenance}`);
  await page.waitForFunction(
    () => {
      const d = (window as unknown as { __slateSplatDebug?: { spark?: { activeSplats?: number } } }).__slateSplatDebug;
      return !!d?.spark && (d.spark.activeSplats ?? 0) > 0;
    },
    undefined,
    { timeout: 90_000 },
  );
  // let the async sort settle, then render + read the centre pixel of that frame
  await page.waitForTimeout(1500);
  return page.evaluate(() => {
    const d = (window as unknown as {
      __slateSplatDebug: { effective: () => Probe["effective"]; samplePixel: (x: number, y: number) => number[] };
    }).__slateSplatDebug;
    return { effective: d.effective(), px: d.samplePixel(0.5, 0.5) };
  });
}

test.describe("spark render fidelity", () => {
  test.setTimeout(180_000);

  test("verified Spirula provenance keeps above-one splat colour and zero screen blur", async ({ page }) => {
    const r = await probe(page, "on");
    expect(r.effective?.profileId).toBe("spirula-3dgut");
    expect(r.effective?.accumExtSplats).toBe(true);
    expect(r.effective?.displayAccumulatorExt).toBe(true);
    expect(r.effective?.uniform_blurAmount).toBe(0);
    expect(r.effective?.uniform_preBlurAmount).toBe(0);
    expect(Math.min(r.px[0], r.px[1], r.px[2])).toBeGreaterThanOrEqual(235);
  });

  test("models without provenance stay on Spark defaults (colour clamped, blur 0.3)", async ({ page }) => {
    const r = await probe(page, "off");
    expect(r.effective?.profileId).toBe("spark-default");
    expect(r.effective?.accumExtSplats).toBe(false);
    expect(r.effective?.uniform_blurAmount).toBeCloseTo(0.3, 6);
    expect(Math.max(r.px[0], r.px[1], r.px[2])).toBeLessThan(190);
  });
});
