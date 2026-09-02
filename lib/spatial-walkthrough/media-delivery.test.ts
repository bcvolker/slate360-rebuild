import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mediaBootState, publicMediaContract, selectDerivativeKey } from "./derivatives";

const clip = {
  master_key: "orgs/x/master.mp4",
  proxy_key: "orgs/x/proxy.mp4",
  poster_key: "orgs/x/poster.jpg",
  public_proxy_key: "orgs/x/public-proxy.mp4",
  public_poster_key: "orgs/x/public-poster.jpg",
  status: "ready",
};

describe("media delivery regression", () => {
  it("emits poster URLs only when the share is READY", () => {
    const ready = publicMediaContract("tok", "c1", clip, "client");
    expect(ready.mediaState).toBe("READY");
    expect(ready.posterUrl).toContain("kind=poster");
    expect(ready.proxyUrl).toContain("kind=proxy");
    const rawOnly = publicMediaContract("tok", "c1", { ...clip, public_proxy_key: null, public_poster_key: null }, "client");
    expect(rawOnly.mediaState).toBe("PROCESSING");
    expect(rawOnly.proxyUrl).toBe("");
    expect(rawOnly.posterUrl).toBeNull();
  });

  it("never selects unbaked proxy_key for client or public", () => {
    expect(selectDerivativeKey(clip, "proxy", "client")).toBe(clip.public_proxy_key);
    expect(selectDerivativeKey(clip, "proxy", "public")).toBe(clip.public_proxy_key);
    expect(selectDerivativeKey({ ...clip, public_proxy_key: null }, "proxy", "client")).toBeNull();
    expect(selectDerivativeKey({ ...clip, public_proxy_key: null }, "proxy", "public")).toBeNull();
  });

  it("keeps PSV mount behind verified poster bytes on the public experience", () => {
    const src = readFileSync("components/spatial-walkthrough/viewer/WalkthroughExperience.tsx", "utf8");
    expect(src).toMatch(/usePosterBytes/);
    expect(src).toMatch(/posterBytes === "ok"/);
    expect(src).toMatch(/restrictView=\{!authoring\}/);
    expect(mediaBootState({ status: "failed" }, "public")).toBe("FAILED");
  });
});
