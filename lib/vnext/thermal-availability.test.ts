import { describe, expect, it } from "vitest";
import {
  findRenderableThermalShare,
  hasViewableCaptureUnderShare,
  isSharePublished,
  isThermalSessionAvailable,
} from "./thermal-availability";

const SHARE = {
  id: "share-1",
  sessionId: "s1",
  isRevoked: false,
  expiresAt: null,
  layerConfig: null,
  brandingSnapshot: null,
};
const CAPTURE = { id: "c1", sessionId: "s1", previewPath: "x.jpg", storagePath: null };
const PUBLISHED = new Set(["s1"]);

describe("isSharePublished", () => {
  it("is false when revoked", () => {
    expect(isSharePublished({ isRevoked: true, expiresAt: null })).toBe(false);
  });

  it("is false when expired, even if not revoked", () => {
    expect(isSharePublished({ isRevoked: false, expiresAt: "2020-01-01T00:00:00.000Z" })).toBe(false);
  });

  it("is true when un-revoked and either no expiry or a future expiry", () => {
    expect(isSharePublished({ isRevoked: false, expiresAt: null })).toBe(true);
    expect(isSharePublished({ isRevoked: false, expiresAt: "2099-01-01T00:00:00.000Z" })).toBe(true);
  });
});

describe("hasViewableCaptureUnderShare", () => {
  it("is false with zero captures", () => {
    expect(hasViewableCaptureUnderShare([], null)).toBe(false);
  });

  it("is false when the only capture has neither a preview nor a storage path", () => {
    expect(hasViewableCaptureUnderShare([{ id: "c1", previewPath: null, storagePath: null }], null)).toBe(false);
  });

  it("is true when a capture has a preview or storage path and no layer_config restricts it", () => {
    expect(hasViewableCaptureUnderShare([{ id: "c1", previewPath: "x.jpg", storagePath: null }], null)).toBe(true);
    expect(hasViewableCaptureUnderShare([{ id: "c1", previewPath: null, storagePath: "x.jpg" }], {})).toBe(true);
  });

  it("is false when layer_config's capture_ids excludes every usable capture", () => {
    expect(
      hasViewableCaptureUnderShare(
        [{ id: "c1", previewPath: "x.jpg", storagePath: null }],
        { capture_ids: ["some-other-id"] },
      ),
    ).toBe(false);
  });

  it("is true when layer_config's capture_ids includes at least one usable capture", () => {
    expect(
      hasViewableCaptureUnderShare(
        [
          { id: "c1", previewPath: "x.jpg", storagePath: null },
          { id: "c2", previewPath: "y.jpg", storagePath: null },
        ],
        { capture_ids: ["c2"] },
      ),
    ).toBe(true);
  });
});

describe("isThermalSessionAvailable — the shared Overview/Explore predicate", () => {
  it("is false with no shares at all", () => {
    expect(isThermalSessionAvailable("s1", [], [CAPTURE], PUBLISHED)).toBe(false);
  });

  it("is false when the only share is revoked", () => {
    expect(isThermalSessionAvailable("s1", [{ ...SHARE, isRevoked: true }], [CAPTURE], PUBLISHED)).toBe(false);
  });

  it("is false when the only share is expired", () => {
    expect(
      isThermalSessionAvailable("s1", [{ ...SHARE, expiresAt: "2020-01-01T00:00:00.000Z" }], [CAPTURE], PUBLISHED),
    ).toBe(false);
  });

  it("is false when published but the session has zero captures", () => {
    expect(isThermalSessionAvailable("s1", [SHARE], [], PUBLISHED)).toBe(false);
  });

  it("is false when published but every capture is excluded by layer_config", () => {
    expect(
      isThermalSessionAvailable("s1", [{ ...SHARE, layerConfig: { capture_ids: ["nope"] } }], [CAPTURE], PUBLISHED),
    ).toBe(false);
  });

  it("is true for a published share with at least one viewable capture", () => {
    expect(isThermalSessionAvailable("s1", [SHARE], [CAPTURE], PUBLISHED)).toBe(true);
  });

  it("ignores shares/captures belonging to a different session", () => {
    const otherSessionShare = { ...SHARE, sessionId: "s2" };
    const otherSessionCapture = { ...CAPTURE, sessionId: "s2" };
    expect(isThermalSessionAvailable("s1", [otherSessionShare], [otherSessionCapture], PUBLISHED)).toBe(false);
  });

  it("is false when a live, viewable share exists but there is no client-portal publication (P1-P3: a report share alone must not auto-publish)", () => {
    expect(isThermalSessionAvailable("s1", [SHARE], [CAPTURE], new Set())).toBe(false);
  });

  it("is false when published but no share is currently live (unpublishing the portal copy must not depend on the report share still existing)", () => {
    expect(isThermalSessionAvailable("s1", [], [CAPTURE], PUBLISHED)).toBe(false);
  });
});

describe("findRenderableThermalShare — the exact-share-selection fix", () => {
  const c1 = { id: "c1", sessionId: "s1", previewPath: "c1.jpg", storagePath: null };

  it("A: picks the qualifying share, not merely the first published one, when an earlier share's own layer_config excludes every capture", () => {
    const shareA = {
      id: "share-A",
      sessionId: "s1",
      isRevoked: false,
      expiresAt: null,
      layerConfig: { capture_ids: ["not-c1"] },
      brandingSnapshot: { brand: "A" },
    };
    const shareB = {
      id: "share-B",
      sessionId: "s1",
      isRevoked: false,
      expiresAt: null,
      layerConfig: { capture_ids: ["c1"] },
      brandingSnapshot: { brand: "B" },
    };

    expect(isThermalSessionAvailable("s1", [shareA, shareB], [c1], PUBLISHED)).toBe(true);
    const chosen = findRenderableThermalShare("s1", [shareA, shareB], [c1]);
    expect(chosen?.id).toBe("share-B");
    // The chosen share's layer_config and branding_snapshot must come from the same row — never
    // shareA's layer_config paired with shareB's branding, or vice versa.
    expect(chosen?.layerConfig).toEqual(shareB.layerConfig);
    expect(chosen?.brandingSnapshot).toEqual(shareB.brandingSnapshot);
  });

  it("B: returns null when multiple published shares exist but none exposes a usable capture", () => {
    const shareA = { ...SHARE, id: "share-A", layerConfig: { capture_ids: ["nope"] } };
    const shareB = { ...SHARE, id: "share-B", layerConfig: { capture_ids: ["also-nope"] } };
    expect(isThermalSessionAvailable("s1", [shareA, shareB], [c1], PUBLISHED)).toBe(false);
    expect(findRenderableThermalShare("s1", [shareA, shareB], [c1])).toBeNull();
  });

  it("C: ignores an expired/revoked share that would otherwise qualify, in favor of a valid one", () => {
    const expiredButQualifying = {
      id: "share-expired",
      sessionId: "s1",
      isRevoked: false,
      expiresAt: "2020-01-01T00:00:00.000Z",
      layerConfig: null,
      brandingSnapshot: { brand: "expired" },
    };
    const revokedButQualifying = {
      id: "share-revoked",
      sessionId: "s1",
      isRevoked: true,
      expiresAt: null,
      layerConfig: null,
      brandingSnapshot: { brand: "revoked" },
    };
    const validShare = {
      id: "share-valid",
      sessionId: "s1",
      isRevoked: false,
      expiresAt: null,
      layerConfig: null,
      brandingSnapshot: { brand: "valid" },
    };

    const chosen = findRenderableThermalShare(
      "s1",
      [expiredButQualifying, revokedButQualifying, validShare],
      [c1],
    );
    expect(chosen?.id).toBe("share-valid");
  });

  it("returns null when the session has no shares at all", () => {
    expect(findRenderableThermalShare("s1", [], [c1])).toBeNull();
  });
});
