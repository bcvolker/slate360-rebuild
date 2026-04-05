import { describe, it, expect } from "vitest";
import {
  validateUploadPermissions,
} from "./validate-upload-permissions";

const FIFTY_ONE_MB = 51 * 1024 * 1024;
const TEN_MB = 10 * 1024 * 1024;

describe("validateUploadPermissions", () => {
  // ── Site Walk rejections ─────────────────────────────────────
  it("rejects .glb for site_walk", () => {
    const result = validateUploadPermissions({
      filename: "model.glb",
      size: TEN_MB,
      app_context: "site_walk",
    });
    expect(result).not.toBeNull();
    expect(result!.error).toBe("UPGRADE_REQUIRED");
    expect(result!.target_app).toBe("tour_builder");
  });

  it("rejects .obj for site_walk", () => {
    const result = validateUploadPermissions({
      filename: "scene.OBJ",
      size: TEN_MB,
      app_context: "site_walk",
    });
    expect(result).not.toBeNull();
    expect(result!.target_app).toBe("tour_builder");
  });

  it("rejects 51 MB file for site_walk", () => {
    const result = validateUploadPermissions({
      filename: "video.mp4",
      size: FIFTY_ONE_MB,
      app_context: "site_walk",
    });
    expect(result).not.toBeNull();
    expect(result!.error).toBe("UPGRADE_REQUIRED");
    expect(result!.message).toContain("50 MB");
  });

  // ── Tour Builder accepts the same files ──────────────────────
  it("accepts 51 MB .glb for tour_builder", () => {
    const result = validateUploadPermissions({
      filename: "model.glb",
      size: FIFTY_ONE_MB,
      app_context: "tour_builder",
    });
    expect(result).toBeNull();
  });

  // ── No app_context (default SlateDrop) ───────────────────────
  it("allows any file when no app_context is set", () => {
    const result = validateUploadPermissions({
      filename: "model.glb",
      size: FIFTY_ONE_MB,
    });
    expect(result).toBeNull();
  });

  // ── Site Walk allows small non-3D files ──────────────────────
  it("allows small .png for site_walk", () => {
    const result = validateUploadPermissions({
      filename: "photo.png",
      size: TEN_MB,
      app_context: "site_walk",
    });
    expect(result).toBeNull();
  });
});
