import { describe, expect, it } from "vitest";
import {
  allowedMediaKind,
  clipReadyPatch,
  selectDerivativeKey,
  stripMasterKeys,
} from "./derivatives";
import { mintShareToken, hashShareToken, tokenMeetsEntropyFloor, publicShareDenial, shareDenied } from "./share-token";
import { filterRuntime } from "./runtime-filter";
import {
  applySkip,
  hiddenWaypointIds,
  isValidRedaction,
  redactionForRecipient,
  rulesForPolicy,
  skipIntervals,
  yawInRange,
  sectorYawCenter,
  type RedactionRule,
} from "./redaction";
import { buildOperatorMask, operatorPatchActiveAt, parseOperatorPatch, rearSector } from "./operator-patch";
import { buildExportPackage } from "./export-package";
import { pinVisibleOnPolicy, attachmentVisibleOnPolicy } from "./pins";
import { DEFAULT_OPERATOR_PATCH } from "./types";

const skipPublic: RedactionRule = {
  clipId: "c1", tStart: 10, tEnd: 20, yawMin: null, yawMax: null,
  pitchMin: null, pitchMax: null, mode: "skip", policy: "public", reason: "badge wall",
};
const skipClient: RedactionRule = {
  clipId: "c1", tStart: 30, tEnd: 40, yawMin: null, yawMax: null,
  pitchMin: null, pitchMax: null, mode: "skip", policy: "client",
};
const coverSeam: RedactionRule = {
  clipId: "c1", tStart: 0, tEnd: 8, yawMin: 160, yawMax: -160,
  pitchMin: -20, pitchMax: 10, mode: "cover", policy: "public", reason: "site office",
};
const hideWp: RedactionRule = {
  clipId: "c1", tStart: 0, tEnd: 0.1, yawMin: null, yawMax: null,
  pitchMin: null, pitchMax: null, mode: "hide-waypoint", policy: "public", waypointId: "wp-secret",
};

describe("MASTER / derivative isolation", () => {
  const clip = { master_key: "orgs/x/master.mp4", proxy_key: "orgs/x/proxy.mp4", poster_key: "orgs/x/poster.jpg" };

  it("never allows master under CLIENT or PUBLIC even if allowMaster is true", () => {
    expect(allowedMediaKind("public", "master", true)).toBe(false);
    expect(allowedMediaKind("client", "master", true)).toBe(false);
    expect(allowedMediaKind("master", "master", true)).toBe(true);
    expect(allowedMediaKind("master", "master", false)).toBe(false);
  });

  it("does not fall through to master when proxy is missing", () => {
    const broken = { master_key: "m.mp4", proxy_key: null, poster_key: null };
    expect(selectDerivativeKey(broken, "proxy", "public")).toBeNull();
    expect(selectDerivativeKey(broken, "proxy", "client")).toBeNull();
    expect(selectDerivativeKey(broken, "master", "public")).toBeNull();
    expect(selectDerivativeKey(clip, "proxy", "public")).toBeNull();
    expect(selectDerivativeKey({ ...clip, public_proxy_key: "pub.mp4" }, "proxy", "public")).toBe("pub.mp4");
    expect(selectDerivativeKey(clip, "proxy", "client")).toBe(clip.proxy_key);
  });

  it("strips master fields from public payloads", () => {
    const stripped = stripMasterKeys({ id: "c", master_key: "secret", master_sha256: "abc", master_bytes: 9, proxy_key: "p" });
    expect(stripped).not.toHaveProperty("master_key");
    expect(stripped).not.toHaveProperty("master_sha256");
    expect((stripped as { proxy_key: string }).proxy_key).toBe("p");
  });

  it("ingest ready patch never writes master_key", () => {
    const patch = clipReadyPatch({ proxyKey: "p", posterKey: "j", masterSha256: "deadbeef" });
    expect(patch).not.toHaveProperty("master_key");
    expect(patch).not.toHaveProperty("master_bytes");
    expect(patch.proxy_key).toBe("p");
  });
});

describe("policy runtime isolation", () => {
  const waypoints = [
    { id: "wp-open", clip_id: "c1", t_seconds: 2, label: "Door", yaw_deg: 0, pitch_deg: 0, sort_order: 0, is_visible: true },
    { id: "wp-secret", clip_id: "c1", t_seconds: 12, label: "Office", yaw_deg: 10, pitch_deg: 0, sort_order: 1, is_visible: true },
  ];
  const pins = [
    { id: "p-pub", visibility: "public", label: "Spec" },
    { id: "p-cli", visibility: "client", label: "RFI" },
    { id: "p-int", visibility: "internal", label: "Payroll" },
  ];
  const attachments = [
    { pin_id: "p-pub", visible_on_public: true },
    { pin_id: "p-cli", visible_on_public: false },
  ];

  it("MASTER sees the unmodified record: no skips, internal pins, hidden waypoints remain", () => {
    const rt = filterRuntime({
      policy: "master", waypoints, pins, attachments,
      redactions: [skipPublic, hideWp], clipId: "c1",
    });
    expect(rt.redactions).toHaveLength(0);
    expect(rt.waypoints.map((w) => w.id)).toContain("wp-secret");
    expect(rt.pins.map((p) => p.id)).toEqual(["p-pub", "p-cli", "p-int"]);
  });

  it("CLIENT applies client skips and hides internal pins", () => {
    const rt = filterRuntime({
      policy: "client", waypoints, pins, attachments,
      redactions: [skipPublic, skipClient, hideWp], clipId: "c1",
    });
    expect(skipIntervals(rt.redactions, "c1")).toEqual([{ start: 30, end: 40 }]);
    expect(rt.pins.map((p) => p.id)).toEqual(["p-pub", "p-cli"]);
    expect(rt.waypoints.map((w) => w.id)).toContain("wp-secret");
  });

  it("PUBLIC applies client+public skips, hides client pins and unpublished attachments, hides waypoints", () => {
    const rt = filterRuntime({
      policy: "public", waypoints, pins, attachments,
      redactions: [skipPublic, skipClient, hideWp], clipId: "c1",
    });
    expect(skipIntervals(rt.redactions, "c1")).toHaveLength(2);
    expect(rt.pins.map((p) => p.id)).toEqual(["p-pub"]);
    expect(rt.attachments).toEqual([{ pin_id: "p-pub", visible_on_public: true }]);
    expect(rt.waypoints.map((w) => w.id)).toEqual(["wp-open"]);
    expect(rt.redactions.every((r) => r.reason == null)).toBe(true);
  });

  it("public attachments cannot be selected by id if not allowlisted", () => {
    expect(attachmentVisibleOnPolicy(false, "public")).toBe(false);
    expect(attachmentVisibleOnPolicy(false, "client")).toBe(true);
    expect(pinVisibleOnPolicy("internal", "public")).toBe(false);
    expect(pinVisibleOnPolicy("internal", "master")).toBe(true);
  });
});

describe("yaw seam", () => {
  it("covers a sector that crosses ±180", () => {
    expect(yawInRange(175, 160, -160)).toBe(true);
    expect(yawInRange(-175, 160, -160)).toBe(true);
    expect(yawInRange(0, 160, -160)).toBe(false);
    expect(isValidRedaction(coverSeam)).toBe(true);
    expect(Math.abs(sectorYawCenter(160, -160))).toBeGreaterThan(170);
  });

  it("operator rear patch fills both ERP edges when centered at 180", () => {
    const patch = parseOperatorPatch({
      rearYawCenter: 180, rearYawWidth: 40, pitchMin: -80, pitchMax: -10, nadirVerticalExtent: 0.1,
    });
    const sector = rearSector(patch);
    expect(yawInRange(180, sector.yawMin, sector.yawMax)).toBe(true);
    expect(yawInRange(-175, sector.yawMin, sector.yawMax)).toBe(true);
    const mask = buildOperatorMask(64, 32, patch);
    expect(mask[31 * 64]).toBe(0);
    expect(mask[31 * 64 + 63]).toBe(0);
    expect(mask[0 * 64 + 32]).toBe(255);
  });

  it("limits the operator overlay to the authored time range", () => {
    const patch = parseOperatorPatch({ tStart: 8, tEnd: 20, enabled: true });
    expect(operatorPatchActiveAt(patch, 0)).toBe(false);
    expect(operatorPatchActiveAt(patch, 8)).toBe(true);
    expect(operatorPatchActiveAt(patch, 19.9)).toBe(true);
    expect(operatorPatchActiveAt(patch, 20)).toBe(false);
  });
});

describe("share token security", () => {
  it("mints >=128-bit tokens and stores a hash, not the raw secret", () => {
    const minted = mintShareToken();
    expect(tokenMeetsEntropyFloor(minted.token)).toBe(true);
    expect(minted.hash).toBe(hashShareToken(minted.token));
    expect(minted.hash).not.toBe(minted.token);
    expect(minted.prefix).toHaveLength(8);
  });

  it("treats missing, revoked, and expired shares identically", () => {
    expect(shareDenied(null)).toBe("unavailable");
    expect(shareDenied({ is_revoked: true, expires_at: null, max_views: null, view_count: 0 })).toBe("unavailable");
    expect(shareDenied({ is_revoked: false, expires_at: "2000-01-01T00:00:00.000Z", max_views: null, view_count: 0 })).toBe("unavailable");
    expect(publicShareDenial()).toEqual({ error: "unavailable" });
  });
});

describe("export package", () => {
  const base = {
    product: "Spatial Walkthrough",
    title: "Lobby",
    capturedAt: "2026-08-01T00:00:00.000Z",
    building: "A",
    floor: "1",
    zone: "Lobby",
    walkthroughType: "interior",
    durationS: 90,
    shareUrl: "https://www.slate360.ai/w/abc",
    pins: [
      { id: "1", label: "Spec", pinType: "document", tSeconds: 3, yawDeg: 10, pitchDeg: 0, visibility: "public" },
      { id: "2", label: "Payroll", pinType: "note", tSeconds: 4, yawDeg: 0, pitchDeg: 0, visibility: "internal" },
    ],
    waypoints: [
      { id: "wp-open", clipId: "c1", tSeconds: 2, label: "Door", zone: null, yawDeg: 0, pitchDeg: 0, isVisible: true },
    ],
    attachments: [
      { id: "a1", pinId: "1", title: "spec.pdf", fileName: "spec.pdf", bytes: new Uint8Array([1]), hidden: false },
      { id: "a2", pinId: "2", title: "secret.pdf", fileName: "secret.pdf", bytes: new Uint8Array([2]), hidden: true },
    ],
    redactions: [skipPublic],
    captureNotes: null,
    stills: [] as Array<{ name: string; bytes: Uint8Array }>,
    includeMaster: false,
    masterPermitted: false,
  };

  it("omits master media, hidden files, and PUBLIC redaction reasons", () => {
    const files = buildExportPackage({ ...base, policy: "public" });
    expect(files.some((f) => f.path.includes("master.mp4"))).toBe(false);
    expect(files.some((f) => f.path.includes("secret.pdf"))).toBe(false);
    expect(files.some((f) => f.path === "privacy-rules.json")).toBe(false);
    const readme = files.find((f) => f.path === "README.txt")?.contents as string;
    expect(readme).toContain("Master 360");
    expect(files.some((f) => f.path === "pin-register.csv")).toBe(true);
    expect(files.some((f) => f.path === "waypoint-register.csv")).toBe(true);
    expect(files.some((f) => f.path === "share-link.html")).toBe(true);
  });

  it("CLIENT export can include privacy rules without master", () => {
    const files = buildExportPackage({ ...base, policy: "client", includeMaster: true, masterPermitted: false });
    expect(files.some((f) => f.path === "privacy-rules.json")).toBe(true);
    expect(files.some((f) => f.path === "MASTER-OMITTED.txt")).toBe(true);
  });
});

describe("skip playback", () => {
  it("jumps over excluded ranges", () => {
    expect(applySkip(15, skipIntervals(rulesForPolicy([skipPublic], "public"), "c1"))).toBe(20);
  });
  it("MASTER skip list is empty", () => {
    expect(rulesForPolicy([skipPublic], "master")).toEqual([]);
  });
  it("hidden waypoint ids are policy-scoped", () => {
    expect(hiddenWaypointIds(rulesForPolicy([hideWp], "public"), "c1").has("wp-secret")).toBe(true);
    expect(hiddenWaypointIds(rulesForPolicy([hideWp], "master"), "c1").size).toBe(0);
  });
});

describe("operator preset parse", () => {
  it("maps legacy wrapFrac onto rear yaw width", () => {
    const p = parseOperatorPatch({ wrapFrac: 0.1, nadirFrac: 0.2 });
    expect(p.nadirVerticalExtent).toBeCloseTo(0.2);
    expect(p.rearYawWidth).toBeCloseTo(36);
    expect(p.nadirRadius).toBe(DEFAULT_OPERATOR_PATCH.nadirRadius);
  });
});
