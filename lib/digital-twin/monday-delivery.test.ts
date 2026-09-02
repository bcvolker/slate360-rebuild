import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("monday binary delivery", () => {
  it("can 302 Twin binaries to signed R2 and stream a same-origin proxy fallback", () => {
    const src = readFileSync("app/preview/twin-metric/asset/route.ts", "utf8");
    expect(src).toMatch(/NextResponse\.redirect/);
    expect(src).toMatch(/signedGetUrl/);
    expect(src).toMatch(/proxy/);
    expect(src).not.toMatch(/no-store/);
  });

  it("302s Walkthrough posters to R2 and keeps 360 video same-origin until CORS is writable", () => {
    const src = readFileSync("app/api/spatial-walkthrough/public/[token]/media/route.ts", "utf8");
    expect(src).toMatch(/NextResponse\.redirect/);
    expect(src).toMatch(/signedGetUrl/);
    expect(src).toMatch(/kind === "poster"/);
    expect(src).toMatch(/GetObjectCommand/);
  });

  it("does not paint opaque Hybrid mesh color over Reality", () => {
    const src = readFileSync("components/digital-twin/kitchen-proof/KitchenProofScene.tsx", "utf8");
    expect(src).toMatch(/hybridEdges/);
    expect(src).toMatch(/wireframe=\{hybridEdges\}/);
    expect(src).toMatch(/antialias: false/);
  });
});
