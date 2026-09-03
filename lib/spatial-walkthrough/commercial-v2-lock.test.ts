import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { publicMediaContract, selectDerivativeKey } from "./derivatives";
import { LIBRARY_KINDS } from "../product-shell/library-kinds";

const clip = {
  master_key: "m.mp4",
  proxy_key: "proxy.mp4",
  poster_key: "poster.jpg",
  public_proxy_key: "public-proxy.mp4",
  public_poster_key: "public-poster.jpg",
  status: "ready",
};

describe("P0 commercial lock", () => {
  it("keeps approved client/public derivatives only", () => {
    const ready = publicMediaContract("tok", "c1", clip, "client");
    expect(ready.mediaState).toBe("READY");
    expect(ready.proxyUrl).toContain("kind=proxy");
    expect(selectDerivativeKey(clip, "proxy", "client")).toBe("public-proxy.mp4");
    expect(selectDerivativeKey({ ...clip, public_proxy_key: null }, "proxy", "client")).toBeNull();
  });

  it("keeps Library walkthrough categories", () => {
    expect(LIBRARY_KINDS.map((k) => k.id)).toEqual([
      "all",
      "walkthrough",
      "twin",
      "site-walk",
      "thermal",
      "tour",
    ]);
  });

  it("does not mount a public operator overlay or rear patch", () => {
    const exp = readFileSync("components/spatial-walkthrough/viewer/WalkthroughExperience.tsx", "utf8");
    expect(exp).toMatch(/restrictView=\{!authoring \|\| simulateClient\}/);
    expect(exp).toMatch(/showOperatorOverlay=\{authoring && !simulateClient\}/);
    expect(exp).toMatch(/usePosterBytes/);
  });

  it("keeps a single public toolbar contract", () => {
    const bar = readFileSync("components/spatial-walkthrough/viewer/PublicWalkToolbar.tsx", "utf8");
    expect(bar).toMatch(/sw-play-pause/);
    expect(bar).toMatch(/Path/);
    expect(bar).toMatch(/Spaces/);
    expect(bar).toMatch(/Ask/);
    expect(bar).not.toMatch(/Start space here/);
  });
});
