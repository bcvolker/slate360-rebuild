import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("monday binary delivery", () => {
  it("redirects Twin binaries to signed R2 instead of buffering them", () => {
    const src = readFileSync("app/preview/twin-metric/asset/route.ts", "utf8");
    expect(src).toMatch(/NextResponse\.redirect/);
    expect(src).toMatch(/signedGetUrl/);
    expect(src).not.toMatch(/no-store/);
  });

  it("redirects Walkthrough share media to signed R2", () => {
    const src = readFileSync("app/api/spatial-walkthrough/public/[token]/media/route.ts", "utf8");
    expect(src).toMatch(/NextResponse\.redirect/);
    expect(src).toMatch(/signedGetUrl/);
    expect(src).not.toMatch(/GetObjectCommand/);
  });

  it("does not paint opaque Hybrid mesh color over Reality", () => {
    const src = readFileSync("components/digital-twin/kitchen-proof/KitchenProofScene.tsx", "utf8");
    expect(src).toMatch(/hybridEdges/);
    expect(src).toMatch(/wireframe=\{hybridEdges\}/);
    expect(src).toMatch(/antialias: false/);
  });
});
