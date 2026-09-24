import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSplatManifest } from "./twin-manifest";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function mockFetch(expectedUrl: string) {
  const calls: string[] = [];
  global.fetch = vi.fn(async (url: string) => {
    calls.push(url);
    return {
      ok: url === expectedUrl,
      json: async () => ({ correction_quaternion: [0, 0, 0, 1] }),
    } as Response;
  }) as unknown as typeof fetch;
  return calls;
}

describe("fetchSplatManifest — URL routing", () => {
  it("routes a legacy /share/twin splat URL to its token-scoped manifest endpoint", async () => {
    const calls = mockFetch("/api/share/twin/tok123/manifest");
    const result = await fetchSplatManifest("/api/share/twin/tok123/splat");
    expect(calls).toEqual(["/api/share/twin/tok123/manifest"]);
    expect(result?.correction_quaternion).toEqual([0, 0, 0, 1]);
  });

  it("routes an authenticated vNext splat URL (with query string) to its manifest endpoint", async () => {
    const calls = mockFetch("/api/vnext/projects/p1/twin-models/m1/manifest");
    await fetchSplatManifest("/api/vnext/projects/p1/twin-models/m1/splat?baked=1");
    expect(calls).toEqual(["/api/vnext/projects/p1/twin-models/m1/manifest"]);
  });

  it("routes a generic public Project/Evidence share splat URL to its own manifest endpoint, not the legacy /share/twin one", async () => {
    const calls = mockFetch("/api/share/project/tok456/twin-models/m2/manifest");
    await fetchSplatManifest("/api/share/project/tok456/twin-models/m2/splat?baked=1");
    expect(calls).toEqual(["/api/share/project/tok456/twin-models/m2/manifest"]);
  });

  it("routes an authenticated legacy splat URL to its manifest endpoint", async () => {
    const calls = mockFetch("/api/digital-twin/models/m3/manifest");
    await fetchSplatManifest("/api/digital-twin/models/m3/splat");
    expect(calls).toEqual(["/api/digital-twin/models/m3/manifest"]);
  });

  it("returns null, not a throw, when the manifest fetch fails and there is no sibling to fall back to", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => null }) as Response) as unknown as typeof fetch;
    const result = await fetchSplatManifest("/api/share/project/tok/twin-models/m/splat");
    expect(result).toBeNull();
  });
});
