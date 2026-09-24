import { describe, expect, it } from "vitest";
import {
  formatDocumentedDate,
  isUsableImageUrl,
  pickHeroKind,
  pickLatestIso,
  resolveProjectHero,
  resolveRepresentations,
  satelliteMapUrl,
} from "./project-hero";

describe("isUsableImageUrl", () => {
  it("accepts http, relative API, and image data URLs", () => {
    expect(isUsableImageUrl("https://cdn.example/a.jpg")).toBe(true);
    expect(isUsableImageUrl("/api/digital-twin/models/1/preview-image")).toBe(true);
    expect(isUsableImageUrl("data:image/svg+xml;utf8,<svg></svg>")).toBe(true);
    expect(isUsableImageUrl("/vnext-preview/reality.svg")).toBe(true);
  });

  it("skips missing and invalid URLs", () => {
    expect(isUsableImageUrl(null)).toBe(false);
    expect(isUsableImageUrl("")).toBe(false);
    expect(isUsableImageUrl("   ")).toBe(false);
    expect(isUsableImageUrl("javascript:alert(1)")).toBe(false);
    expect(isUsableImageUrl("null")).toBe(false);
  });
});

describe("resolveProjectHero precedence", () => {
  const urls = {
    reality: "https://cdn.example/reality.jpg",
    pano360: "https://cdn.example/360.jpg",
    drone: "https://cdn.example/drone.jpg",
    plan: "https://cdn.example/plan.jpg",
    projectImage: "https://cdn.example/cover.jpg",
    satellite: "/api/static-map?center=1,2&zoom=16&size=800x450&maptype=satellite",
  };

  it("uses Reality before every lower source", () => {
    expect(resolveProjectHero(urls)).toEqual({ kind: "reality", url: urls.reality });
  });

  it("uses 360 when Reality is missing", () => {
    expect(resolveProjectHero({ ...urls, reality: null })).toEqual({
      kind: "pano360",
      url: urls.pano360,
    });
  });

  it("uses drone when Reality and 360 are missing", () => {
    expect(resolveProjectHero({ ...urls, reality: "", pano360: "javascript:void(0)" })).toEqual({
      kind: "drone",
      url: urls.drone,
    });
  });

  it("uses plan, then project image, then satellite", () => {
    expect(resolveProjectHero({ plan: urls.plan, projectImage: urls.projectImage, satellite: urls.satellite })).toEqual({
      kind: "plan",
      url: urls.plan,
    });
    expect(resolveProjectHero({ projectImage: urls.projectImage, satellite: urls.satellite })).toEqual({
      kind: "projectImage",
      url: urls.projectImage,
    });
    expect(resolveProjectHero({ satellite: urls.satellite })).toEqual({
      kind: "satellite",
      url: urls.satellite,
    });
  });

  it("falls through to a neutral placeholder without throwing", () => {
    expect(resolveProjectHero({})).toEqual({ kind: "neutral", url: null });
    expect(resolveProjectHero({ reality: " ", pano360: "undefined" })).toEqual({
      kind: "neutral",
      url: null,
    });
  });

  it("does not treat an image as a representation", () => {
    const hero = resolveProjectHero({ projectImage: urls.projectImage });
    expect(hero.kind).toBe("projectImage");
    expect(resolveRepresentations({ reality: false, plan: true })).toEqual(["plan"]);
    expect(resolveRepresentations({})).toEqual([]);
  });
});

describe("hero helpers", () => {
  it("builds a satellite URL only for valid coordinates", () => {
    expect(satelliteMapUrl(45.5, -122.6)).toContain("maptype=satellite");
    expect(satelliteMapUrl(95, 0)).toBeNull();
  });

  it("picks the latest valid timestamp", () => {
    expect(pickLatestIso(["2026-01-01T00:00:00.000Z", "not-a-date", "2026-09-14T00:00:00.000Z"])).toBe(
      "2026-09-14T00:00:00.000Z",
    );
    expect(pickLatestIso([null, ""])).toBeNull();
  });

  it("formats a documented date in plain language", () => {
    expect(formatDocumentedDate("2026-09-14T15:00:00.000Z")).toBe("Last documented Sep 14, 2026");
    expect(formatDocumentedDate("nope")).toBeNull();
  });

  it("keeps representation order and omits missing flags", () => {
    expect(resolveRepresentations({ thermal: true, reality: true, drone: false })).toEqual([
      "reality",
      "thermal",
    ]);
  });

  it("picks hero kind from availability flags", () => {
    expect(
      pickHeroKind({
        reality: false,
        pano360: false,
        drone: false,
        plan: false,
        projectImage: false,
        satellite: true,
      }),
    ).toBe("satellite");
  });
});
