import { describe, expect, it } from "vitest";

import {
  canExposePinAttachmentOnShare,
  deserializePin,
  serializePinMetadata,
} from "./pin-anchor";
import { pinRetainsWorldAnchor } from "./twin-epoch";
import { vec3 } from "./s360-world";

describe("pin anchors", () => {
  it("stores S360_WORLD position + normal and restores them", () => {
    const pin = deserializePin({
      id: "p1",
      title: "RFI-12 header",
      body: "Confirm beam size",
      position: vec3(1, 2.4, -3),
      normal: vec3(0, 1, 0),
      metadata: {
        v: 1,
        category: "rfi",
        scope: "project",
        normal: vec3(0, 1, 0),
        source_mesh_id: "mesh-a",
        epoch_id: "aug27",
        face_index: 12,
      },
      model_id: "model-a",
    });
    expect(pin?.category).toBe("rfi");
    expect(pin?.scope).toBe("project");
    expect(pin?.anchor.position).toEqual(vec3(1, 2.4, -3));
    expect(pin?.anchor.faceIndex).toBe(12);
    expect(serializePinMetadata(pin!).source_mesh_id).toBe("mesh-a");
    expect(pinRetainsWorldAnchor(pin!.anchor.position, "reality", "geometry")).toEqual(
      pin!.anchor.position,
    );
  });
});

describe("attachment share permissions", () => {
  it("does not leak stored files on view-only share links", () => {
    expect(
      canExposePinAttachmentOnShare({
        shareRole: "view",
        kind: "document",
        hasStorageKey: true,
        hasUnifiedFileId: false,
        hasExternalUrl: false,
      }),
    ).toBe(false);
  });

  it("allows an explicit public URL on view-only shares", () => {
    expect(
      canExposePinAttachmentOnShare({
        shareRole: "view",
        kind: "link",
        hasStorageKey: false,
        hasUnifiedFileId: false,
        hasExternalUrl: true,
      }),
    ).toBe(true);
  });

  it("keeps invoices off annotate-only tokens", () => {
    expect(
      canExposePinAttachmentOnShare({
        shareRole: "annotate",
        kind: "invoice",
        hasStorageKey: true,
        hasUnifiedFileId: false,
        hasExternalUrl: false,
      }),
    ).toBe(false);
    expect(
      canExposePinAttachmentOnShare({
        shareRole: "download",
        kind: "invoice",
        hasStorageKey: true,
        hasUnifiedFileId: false,
        hasExternalUrl: false,
      }),
    ).toBe(true);
  });

  it("denies anonymous access", () => {
    expect(
      canExposePinAttachmentOnShare({
        shareRole: null,
        kind: "photo",
        hasStorageKey: false,
        hasUnifiedFileId: false,
        hasExternalUrl: true,
      }),
    ).toBe(false);
  });
});
