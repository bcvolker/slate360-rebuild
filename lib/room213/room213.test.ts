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
    // Walk removes nothing: exterior splats carry the walls' interior appearance.
    const walk = cropBoxFor("walk", false);
    expect(walk.min.x).toBeLessThan(-100);
    expect(walk.max.y).toBeGreaterThan(100);
    expect(PRESENTATION.containsBox(ROOM)).toBe(true);
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
  it("lets you walk between and through table rows; only the walls stop you", () => {
    // Physical test: the old furniture mask left 10–20 cm gaps and dead-ended the joystick.
    const end = walkableAlong(-3.2, 0.36, -3.2, -3.0)!;
    expect(end.z).toBeCloseTo(-3.0);
    const s = slideMove(-3.2, 0.36, 0, -5);
    expect(s.z).toBe(0.36); // a 5-unit jump would cross the wall: refused
    const toWall = walkableAlong(0, 0.36, 0, -10)!;
    expect(toWall.z).toBeGreaterThan(ROOM.min.z); // stops inside the wall
    expect(isWalkable(ROOM.max.x - 0.05, 0)).toBe(false);
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
  it("builds the renderer from the verified profile, LoD off, one golden asset, fixed pixel ratio", () => {
    const scene = readFileSync(join(process.cwd(), "components/room213/Room213Scene.tsx"), "utf8");
    expect(scene).toMatch(/sparkRendererArgsFor\(gl, profile, \{ enableLod: false \}\)/);
    expect(scene).toMatch(/useSparkProfileCheck\(/);
    const page = readFileSync(join(process.cwd(), "app/preview/room213/page.tsx"), "utf8");
    expect(page).not.toMatch(/PRES_|_local|\.rad/);
    const exp = readFileSync(join(process.cwd(), "components/room213/Room213Experience.tsx"), "utf8");
    expect(exp).toMatch(/dpr=\{probeDpr \?\? \[1, 2\]\}/);
    expect(exp).not.toMatch(/AdaptiveDpr|setDpr/);
    const model = readFileSync(join(process.cwd(), "components/room213/Room213Model.tsx"), "utf8");
    expect(model).toMatch(/extSplats: true/);
    expect(model).toMatch(/stream: counted/);
  });
});

describe("golden fidelity validation", () => {
  const eff = (o: Record<string, unknown>) =>
    ({ expected: "spirula-3dgut", ok: true, mismatches: [], effective: { accumExtSplats: true, uniformEnableExtSplats: true, uniformBlurAmount: 0, uniformPreBlurAmount: 0, ...o } }) as never;
  it("verifies only the corrected Spirula profile with the three live uniforms", async () => {
    const { goldenFidelity } = await import("./fidelity");
    const { SPIRULA_3DGUT_PROFILE, SPARK_DEFAULT_PROFILE } = await import("../digital-twin/spark-render-profile");
    expect(goldenFidelity(SPIRULA_3DGUT_PROFILE, null).state).toBe("pending");
    expect(goldenFidelity(SPIRULA_3DGUT_PROFILE, eff({})).state).toBe("verified");
    // A fallback to Spark defaults must NOT validate against itself.
    const fallback = goldenFidelity(SPARK_DEFAULT_PROFILE, eff({ accumExtSplats: false, uniformBlurAmount: 0.3 }));
    expect(fallback.state).toBe("degraded");
    expect(fallback.reasons.join(" ")).toMatch(/lineage/);
    expect(goldenFidelity(SPIRULA_3DGUT_PROFILE, eff({ uniformBlurAmount: 0.3 })).state).toBe("degraded");
    expect(goldenFidelity(SPIRULA_3DGUT_PROFILE, eff({ uniformPreBlurAmount: 0.1 })).state).toBe("degraded");
    expect(goldenFidelity(SPIRULA_3DGUT_PROFILE, eff({ accumExtSplats: false })).state).toBe("degraded");
  });
  it("rehoming a walk pose bumps its epoch and keeps eye height", async () => {
    const { rehomeWalk, walkEntryPose } = await import("../../components/room213/walk-entry");
    const { EYE_Y } = await import("./scene-config");
    const pose = walkEntryPose();
    pose.position.set(0, 5, 0);
    rehomeWalk(pose, walkEntryPose());
    expect(pose.epoch).toBe(1);
    expect(pose.position.y).toBeCloseTo(EYE_Y);
    expect(pose.position.x).toBeCloseTo(walkEntryPose().position.x);
  });
});

describe("view in room", () => {
  it("stands on walkable floor at eye height, facing each pin, a sensible distance away", async () => {
    const { pinViewPose, pinToRoom } = await import("./pin-focus");
    for (const pin of ROOM213_PINS) {
      const pose = pinViewPose(pin);
      const { position: p } = pinToRoom(pin);
      expect(isWalkable(pose.position.x, pose.position.z), pin.pin_id).toBe(true);
      expect(pose.position.y).toBeCloseTo(EYE_Y, 5);
      const fwd = new THREE.Vector3(-Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
      const to = new THREE.Vector3(p.x - pose.position.x, 0, p.z - pose.position.z);
      const dist = to.length();
      expect(fwd.dot(to.normalize()), pin.pin_id).toBeGreaterThan(0.99); // looking straight at it
      expect(dist, pin.pin_id).toBeGreaterThan(0.6);
      expect(dist, pin.pin_id).toBeLessThan(4);
    }
  });
  it("walk never crops unless the ceiling is hidden", () => {
    const shown = cropBoxFor("walk", false);
    const hidden = cropBoxFor("walk", true);
    expect(shown.max.y).toBeGreaterThan(100);
    expect(hidden.max.y).toBe(WALK_CEILING_CUT_Y);
    expect(hidden.min.x).toBeLessThan(-100); // only the ceiling plane, never the walls
  });
});
