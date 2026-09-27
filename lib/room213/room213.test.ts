import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { cropBoxFor } from "./edit-state";
import { fitHeroPose, heroPoseFor, HERO_SUBJECT } from "./hero";
import { ROOM213_PINS, presentContentTypes } from "./pins";
import { EYE_Y, GOLDEN_SHA256, OPEN_TOP_Y, OPEN_WALL_MARGIN, PLAN_TOP_Y, PRESENTATION, ROOM, WALK_CEILING_CUT_Y } from "./scene-config";
import { isWalkable, nearestWalkable, slideMove, walkableAlong } from "./walk-area";
import data from "./presentation-data.json";

describe("room213 presentation data", () => {
  it("is bound to the golden model hash and the authoritative room box", () => {
    expect(GOLDEN_SHA256).toBe("7e7b5d18af92d5f4b751977d6d96f2251b896c46f1dbb37d356eed3dd0823a62");
    expect(data.room_V.min).toEqual([-6.21, -1.81, -3.69]);
    expect(data.room_V.max).toEqual([4.97, 0.67, 4.39]);
    expect(data.counts_centres["outside_room_plus_1.0"]).toBe(35764);
    expect(data.counts_centres["shell_0.35_to_1.0"]).toBe(data.counts_centres["outside_room_plus_0.35"] - 35764);
  });
});

describe("crop edit states", () => {
  it("dollhouse and plan open the room and tighten the walls; walk keeps the tier-1 volume", () => {
    for (const v of ["dollhouse", "plan"] as const) {
      const b = cropBoxFor(v, false);
      expect(b.max.y).toBe(v === "plan" ? PLAN_TOP_Y : OPEN_TOP_Y);
      expect(b.min.x).toBeCloseTo(ROOM.min.x - OPEN_WALL_MARGIN);
      expect(b.max.z).toBeCloseTo(ROOM.max.z + OPEN_WALL_MARGIN);
      expect(b.min.y).toBe(PRESENTATION.min.y); // floor never clipped
    }
    expect(cropBoxFor("walk", false).equals(PRESENTATION)).toBe(true);
  });
  it("ceiling choice only affects walk, and survives view changes", () => {
    expect(cropBoxFor("walk", true).max.y).toBe(WALK_CEILING_CUT_Y);
    expect(cropBoxFor("dollhouse", true).equals(cropBoxFor("dollhouse", false))).toBe(true);
    expect(cropBoxFor("walk", true).max.y).toBe(WALK_CEILING_CUT_Y); // unchanged after querying another view
  });
});

describe("walkable area", () => {
  it("has a walkable entry and blocks outside the walls", () => {
    const e = nearestWalkable(3.3, 0.36);
    expect(e).not.toBeNull();
    expect(isWalkable(e!.x, e!.z)).toBe(true);
    expect(isWalkable(ROOM.max.x + 0.5, 0)).toBe(false);
    expect(isWalkable(ROOM.min.x + 0.05, 0.36)).toBe(false);
  });
  it("never steps across a table row", () => {
    // From the centre aisle toward the far side of the near-window block: must stop before the furniture.
    const end = walkableAlong(-3.2, 0.36, -3.2, -3.0)!;
    expect(end.z).toBeGreaterThan(-0.6);
    const s = slideMove(-3.2, 0.36, 0, -5);
    expect(s.z).toBe(0.36);
  });
  it("keeps eye height above the floor", () => {
    expect(EYE_Y).toBeGreaterThan(ROOM.min.y);
    expect(EYE_Y).toBeLessThan(ROOM.max.y);
  });
});

describe("hero framing", () => {
  it("fits the opened room inside the requested fill for landscape and portrait", () => {
    for (const aspect of [16 / 10, 9 / 19.5]) {
      const pose = heroPoseFor(aspect);
      const cam = new THREE.PerspectiveCamera(pose.fov, aspect, 0.05, 500);
      cam.position.copy(pose.position);
      cam.lookAt(pose.target);
      cam.updateMatrixWorld(true);
      const q = [HERO_SUBJECT.min, HERO_SUBJECT.max].flatMap((a) => [HERO_SUBJECT.min, HERO_SUBJECT.max].flatMap((b) =>
        [HERO_SUBJECT.min, HERO_SUBJECT.max].map((c) => new THREE.Vector3(a.x, b.y, c.z).project(cam))));
      const xs = q.map((v) => v.x);
      const ys = q.map((v) => v.y);
      expect(Math.max(...xs.map(Math.abs), ...ys.map(Math.abs))).toBeLessThanOrEqual(0.95); // whole room in frame
      expect(Math.abs(Math.min(...xs) + Math.max(...xs))).toBeLessThan(0.05); // centred
      expect(Math.abs(Math.min(...ys) + Math.max(...ys))).toBeLessThan(0.05);
      expect(pose.position.y).toBeGreaterThan(OPEN_TOP_Y);
      expect(pose.target.y).toBeGreaterThanOrEqual(HERO_SUBJECT.min.y); // orbit pivot inside the room
      expect(pose.target.y).toBeLessThanOrEqual(HERO_SUBJECT.max.y);
    }
    const tight = fitHeroPose(1.6, { azimuthDeg: 135, elevationDeg: 36, fov: 45, fill: 0.5 });
    const loose = fitHeroPose(1.6, { azimuthDeg: 135, elevationDeg: 36, fov: 45, fill: 0.9 });
    expect(tight.position.distanceTo(tight.target)).toBeGreaterThan(loose.position.distanceTo(loose.target));
  });
});

describe("spatial pins", () => {
  it("are four curated pins bound to the golden model in the file frame", () => {
    expect(ROOM213_PINS).toHaveLength(4);
    for (const p of ROOM213_PINS) {
      expect(p.source_model_sha).toBe(GOLDEN_SHA256);
      expect(p.source_frame).toBe("file");
      expect(Math.hypot(...p.normal)).toBeCloseTo(1, 2);
      for (const c of p.content) expect(c.url).toMatch(/^\/preview\/room213\/content\//);
    }
  });
  it("only expose content categories that exist, and never the private email asset", () => {
    expect(presentContentTypes(ROOM213_PINS).sort()).toEqual(["drawing", "photo"]);
    expect(JSON.stringify(ROOM213_PINS)).not.toMatch(/brooke|email/i);
  });
});

describe("no million-splat scans in the Room 213 viewer", () => {
  it("never calls the full-splat bounds scan or splat raycast", () => {
    const dir = join(process.cwd(), "components/room213");
    for (const f of readdirSync(dir)) {
      const src = readFileSync(join(dir, f), "utf8");
      expect(src, f).not.toMatch(/getSplatSceneBounds|computePercentileSplatBounds|forEachSplat|raycastSplatMesh/);
    }
  });
  it("builds the renderer from the verified profile, never Spark defaults", () => {
    const scene = readFileSync(join(process.cwd(), "components/room213/Room213Scene.tsx"), "utf8");
    // LoD stays off for the canonical PLY: only the local-only paged-RAD experiment turns it on.
    expect(scene).toMatch(/sparkRendererArgsFor\(gl, profile, \{ enableLod: pagedRad \}\)/);
    expect(scene).toMatch(/pagedRad = false,/);
    const page = readFileSync(join(process.cwd(), "app/preview/room213/page.tsx"), "utf8");
    expect(page).toMatch(/const pagedRad = modelUrl\.endsWith\("\.rad"\);/);
    expect(page).toMatch(/!process\.env\.VERCEL && process\.env\.NODE_ENV !== "production"/);
    expect(scene).toMatch(/useSparkProfileCheck\(/);
    const model = readFileSync(join(process.cwd(), "components/room213/Room213Model.tsx"), "utf8");
    expect(model).toMatch(/extSplats: true/);
    expect(model).toMatch(/stream: counted/);
  });
});
