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

  it("streams Walkthrough posters and 360 video same-origin with Range (R2 CORS is not writable)", () => {
    const src = readFileSync("app/api/spatial-walkthrough/public/[token]/media/route.ts", "utf8");
    expect(src).not.toMatch(/NextResponse\.redirect/);
    expect(src).toMatch(/transformToWebStream/);
    expect(src).toMatch(/GetObjectCommand/);
    expect(src).toMatch(/abortSignal/);
    expect(src).toMatch(/immutable/);
  });

  it("does not paint opaque Hybrid mesh color over Reality", () => {
    const src = readFileSync("components/digital-twin/kitchen-proof/KitchenProofScene.tsx", "utf8");
    expect(src).toMatch(/hybridEdges/);
    expect(src).toMatch(/wireframe=\{hybridEdges\}/);
    expect(src).toMatch(/antialias: false/);
    expect(src).toMatch(/showGeometry/);
    expect(src).not.toMatch(/!splatReady/);
  });

  it("keeps the current Twin layer until a visibility probe commits Reality", () => {
    const src = readFileSync("components/digital-twin/kitchen-proof/KitchenProofViewer.tsx", "utf8");
    expect(src).toMatch(/probeLayer !== "reality"/);
    expect(src).toMatch(/data-scene-visible/);
    expect(src).toMatch(/data-visible-layer/);
  });
});
