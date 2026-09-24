import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { VNEXT_CLIENT_NAV, VNEXT_OWNER_NAV } from "./nav";

const VNEXT_APP_ROOT = path.join(process.cwd(), "app", "vnext");

const REDIRECT_ONLY_ALLOWLIST = new Set(["app/vnext/page.tsx"]);

const PROTECTION_MARKERS = [
  "VnextClientRoutePage",
  "VnextOwnerRoutePage",
  "requireVnextSession(",
  "requireVnextOwner(",
];

function hrefToPageRel(href: string): string {
  if (href === "/vnext/ops") return "app/vnext/ops/page.tsx";
  if (href.startsWith("/vnext/ops/")) return `app/vnext/ops/${href.slice("/vnext/ops/".length)}/page.tsx`;
  if (href.startsWith("/vnext/")) return `app/vnext/(client)/${href.slice("/vnext/".length)}/page.tsx`;
  throw new Error(`Unexpected vNext href: ${href}`);
}

function walkPageFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPageFiles(next, out);
      continue;
    }
    if (entry.name === "page.tsx" || entry.name === "page.ts") out.push(next);
  }
  return out;
}

function toPosix(absPath: string): string {
  return path.relative(process.cwd(), absPath).split(path.sep).join("/");
}

function isProtected(source: string): boolean {
  return PROTECTION_MARKERS.some((marker) => source.includes(marker));
}

function isRedirectOnlyIndex(relPath: string, source: string): boolean {
  if (!REDIRECT_ONLY_ALLOWLIST.has(relPath)) return false;
  return source.includes("redirect(") && source.includes("/vnext/home");
}

describe("vNext production route-guard", () => {
  it("does not scan preview fixtures as production vNext pages", () => {
    expect(VNEXT_APP_ROOT.replace(/\\/g, "/").endsWith("/app/vnext")).toBe(true);
    const previewLeak = walkPageFiles(VNEXT_APP_ROOT).some((file) =>
      toPosix(file).includes("preview/vnext"),
    );
    expect(previewLeak).toBe(false);
  });

  it("requires every user-facing app/vnext page to be protected or allowlisted", () => {
    const pages = walkPageFiles(VNEXT_APP_ROOT).map((absPath) => {
      const relPath = toPosix(absPath);
      const source = readFileSync(absPath, "utf8");
      return { relPath, source };
    });

    expect(pages.length).toBeGreaterThan(0);

    const unprotected = pages.filter(({ relPath, source }) => {
      if (isRedirectOnlyIndex(relPath, source)) return false;
      return !isProtected(source);
    });

    expect(
      unprotected.map((page) => page.relPath),
      "A production /vnext page must use VnextClientRoutePage, VnextOwnerRoutePage, requireVnextSession, requireVnextOwner, or be the allowlisted /vnext index redirect.",
    ).toEqual([]);
  });

  it("keeps the allowlisted index as redirect-only, not a public content page", () => {
    const index = path.join(VNEXT_APP_ROOT, "page.tsx");
    expect(statSync(index).isFile()).toBe(true);
    const source = readFileSync(index, "utf8");
    expect(isRedirectOnlyIndex("app/vnext/page.tsx", source)).toBe(true);
    expect(source).not.toContain("VnextPageScaffold");
  });

  it("maps every nav destination to a protected production page", () => {
    for (const item of [...VNEXT_CLIENT_NAV, ...VNEXT_OWNER_NAV]) {
      const relPath = hrefToPageRel(item.href);
      const absPath = path.join(process.cwd(), ...relPath.split("/"));
      expect(statSync(absPath).isFile(), relPath).toBe(true);
      expect(isProtected(readFileSync(absPath, "utf8")), relPath).toBe(true);
    }
  });
});
