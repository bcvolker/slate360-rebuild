import { describe, expect, it } from "vitest";
import { hasViewableCaptureUnderShare, isSharePublished, isThermalSessionAvailable } from "./thermal-availability";

const SHARE = { sessionId: "s1", isRevoked: false, expiresAt: null, layerConfig: null };
const CAPTURE = { id: "c1", sessionId: "s1", previewPath: "x.jpg", storagePath: null };

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
    expect(isThermalSessionAvailable("s1", [], [CAPTURE])).toBe(false);
  });

  it("is false when the only share is revoked", () => {
    expect(isThermalSessionAvailable("s1", [{ ...SHARE, isRevoked: true }], [CAPTURE])).toBe(false);
  });

  it("is false when the only share is expired", () => {
    expect(
      isThermalSessionAvailable("s1", [{ ...SHARE, expiresAt: "2020-01-01T00:00:00.000Z" }], [CAPTURE]),
    ).toBe(false);
  });

  it("is false when published but the session has zero captures", () => {
    expect(isThermalSessionAvailable("s1", [SHARE], [])).toBe(false);
  });

  it("is false when published but every capture is excluded by layer_config", () => {
    expect(
      isThermalSessionAvailable("s1", [{ ...SHARE, layerConfig: { capture_ids: ["nope"] } }], [CAPTURE]),
    ).toBe(false);
  });

  it("is true for a published share with at least one viewable capture", () => {
    expect(isThermalSessionAvailable("s1", [SHARE], [CAPTURE])).toBe(true);
  });

  it("ignores shares/captures belonging to a different session", () => {
    const otherSessionShare = { ...SHARE, sessionId: "s2" };
    const otherSessionCapture = { ...CAPTURE, sessionId: "s2" };
    expect(isThermalSessionAvailable("s1", [otherSessionShare], [otherSessionCapture])).toBe(false);
  });
});
