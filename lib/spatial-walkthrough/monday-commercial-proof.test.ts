import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("monday commercial proof gates", () => {
  it("keeps a single /portal/[token] route under the public group", () => {
    expect(existsSync("app/(public)/portal/[token]/page.tsx")).toBe(true);
    expect(existsSync("app/portal/[token]/page.tsx")).toBe(false);
  });

  it("crops public hero media instead of serving a raw ERP poster", () => {
    const src = readFileSync("app/api/spatial-walkthrough/public/[token]/media/route.ts", "utf8");
    expect(src).toMatch(/kind === "hero"/);
    expect(src).toMatch(/sharp/);
    expect(src).toMatch(/extract/);
  });

  it("gates Twin preview binaries behind share or org membership", () => {
    const src = readFileSync("app/preview/twin-metric/asset/route.ts", "utf8");
    expect(src).toMatch(/authorizeTwinPreviewAsset/);
    expect(src).not.toMatch(/error: "not found", key/);
  });
});
