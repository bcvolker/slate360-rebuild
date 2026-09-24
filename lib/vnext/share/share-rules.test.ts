import { describe, expect, it } from "vitest";
import type { VnextExploreData } from "@/lib/vnext/explore-types";
import type { VnextVisit } from "@/lib/vnext/history/history-types";
import { scopeFromIncluded } from "@/lib/vnext/scope/resolve-client-scope";
import {
  assessShareTarget,
  evidenceIsPublic,
  formatShareDate,
  isShareToken,
  lockExploreToSource,
  newShareToken,
  parseExpiresOn,
  parseShareLabel,
  preparePublicVisits,
  publicPortalSections,
  publicSourceAllowed,
  retargetExploreMedia,
  retargetPublicUrl,
  shareLinkStatus,
} from "./share-rules";

const NOW = new Date("2026-09-22T12:00:00.000Z");

describe("vNext share rules", () => {
  it("uses a long random token and rejects short or sequential ids", () => {
    const token = newShareToken();
    expect(isShareToken(token)).toBe(true);
    expect(isShareToken("1")).toBe(false);
    expect(isShareToken("portal-token")).toBe(false);
  });

  it("keeps expiry and revocation on the link", () => {
    expect(shareLinkStatus({ isRevoked: false, expiresAt: null }, NOW)).toBe("active");
    expect(shareLinkStatus({ isRevoked: false, expiresAt: "2026-09-21T00:00:00.000Z" }, NOW)).toBe("expired");
    expect(shareLinkStatus({ isRevoked: true, expiresAt: null }, NOW)).toBe("revoked");
    expect(shareLinkStatus({ isRevoked: true, expiresAt: "2026-09-21T00:00:00.000Z" }, NOW)).toBe("revoked");
    expect(parseExpiresOn("2026-10-01", NOW)).toEqual({ ok: true, expiresAt: "2026-10-01T23:59:59.999Z" });
    expect(parseExpiresOn("2026-09-01", NOW).ok).toBe(false);
    expect(parseExpiresOn("", NOW)).toEqual({ ok: true, expiresAt: null });
    expect(parseShareLabel("  Client  ")).toEqual({ ok: true, label: "Client" });
    expect(parseShareLabel("x".repeat(81)).ok).toBe(false);
    expect(formatShareDate(null)).toBe("None");
  });

  it("omits items, documents, and thermal from a public project link", () => {
    const sections = publicPortalSections(
      scopeFromIncluded(["reality", "thermal", "items", "documents", "history", "compare"]),
    );
    expect(sections).toEqual(["overview", "explore", "history"]);
    expect(publicPortalSections(scopeFromIncluded(["thermal", "items", "documents"]))).toEqual(["overview"]);
  });

  it("rejects a saved view that is cross-project, thermal, unpublished, or outside scope", () => {
    const base = { projectAllowed: true, projectId: "project-a" };
    expect(assessShareTarget({ ...base, target: "nope", view: null }).ok).toBe(false);
    expect(assessShareTarget({ ...base, projectAllowed: false, target: "project", view: null })).toMatchObject({
      status: 404,
    });
    expect(
      assessShareTarget({
        ...base,
        target: "saved_view",
        view: { projectId: "project-b", representation: "reality", capabilityIncluded: true, published: true },
      }),
    ).toMatchObject({ status: 404 });
    expect(
      assessShareTarget({
        ...base,
        target: "saved_view",
        view: { projectId: "project-a", representation: "thermal", capabilityIncluded: true, published: true },
      }),
    ).toMatchObject({ status: 409 });
    expect(
      assessShareTarget({
        ...base,
        target: "saved_view",
        view: { projectId: "project-a", representation: "reality", capabilityIncluded: false, published: true },
      }),
    ).toMatchObject({ status: 409 });
    expect(
      assessShareTarget({
        ...base,
        target: "saved_view",
        view: { projectId: "project-a", representation: "reality", capabilityIncluded: true, published: false },
      }),
    ).toMatchObject({ status: 409 });
    expect(
      assessShareTarget({
        ...base,
        target: "saved_view",
        view: { projectId: "project-a", representation: "reality", capabilityIncluded: true, published: true },
      }).ok,
    ).toBe(true);
    expect(evidenceIsPublic({ representation: "thermal", capabilityIncluded: true, published: true })).toBe(false);
    expect(evidenceIsPublic({ representation: "reality", capabilityIncluded: false, published: true })).toBe(false);
  });

  it("refuses another project's source and an evidence link pointed at a different source", () => {
    const shared = {
      shareProjectId: "project-a",
      targetType: "project" as const,
      savedRepresentation: null,
      savedSourceId: null,
      representation: "reality" as const,
      sourceId: "model-a",
      capabilityIncluded: true,
      published: true,
    };
    expect(publicSourceAllowed({ ...shared, sourceProjectId: "project-b" })).toBe(false);
    expect(publicSourceAllowed({ ...shared, sourceProjectId: "project-a", published: false })).toBe(false);
    expect(publicSourceAllowed({ ...shared, sourceProjectId: "project-a", capabilityIncluded: false })).toBe(false);
    expect(publicSourceAllowed({ ...shared, sourceProjectId: "project-a", representation: "thermal" })).toBe(false);
    expect(
      publicSourceAllowed({
        ...shared,
        sourceProjectId: "project-a",
        targetType: "saved_view",
        savedRepresentation: "reality",
        savedSourceId: "model-a",
        sourceId: "model-b",
      }),
    ).toBe(false);
    expect(
      publicSourceAllowed({
        ...shared,
        sourceProjectId: "project-a",
        targetType: "saved_view",
        savedRepresentation: "reality",
        savedSourceId: "model-a",
      }),
    ).toBe(true);
  });

  it("keeps an evidence link on its source and rewrites only that project's media", () => {
    const data = {
      projectId: "project-a",
      projectName: "Harbor",
      availableRepresentations: ["reality", "geometry"],
      sourcesByRepresentation: {},
      activeRepresentation: "reality",
      activeSourceId: "model-a",
      activeSourceData: { kind: "reality", viewerKind: "splat", modelUrl: "/api/vnext/projects/project-a/twin-models/model-a/splat", modelTitle: "A" },
      activeSourceError: null,
      overviewHref: "/vnext/projects/project-a",
    } satisfies VnextExploreData;
    expect(lockExploreToSource(data, "reality", "model-b")).toBeNull();
    const locked = lockExploreToSource(data, "reality", "model-a");
    expect(locked?.availableRepresentations).toEqual(["reality"]);
    const retargeted = retargetExploreMedia(
      {
        ...data,
        activeRepresentation: "geometry",
        activeSourceId: "mesh-a",
        activeSourceData: { kind: "geometry", viewerKind: "model", modelUrl: "https://signed.example/mesh.glb", modelTitle: "Mesh" },
      },
      "token-value",
    );
    expect(retargeted.activeSourceData && "modelUrl" in retargeted.activeSourceData ? retargeted.activeSourceData.modelUrl : "").toBe(
      "/api/share/project/token-value/twin-models/mesh-a/splat",
    );
    expect(retargetPublicUrl("/api/vnext/projects/project-a/items/pano/image", "project-a", "token-value")).toBe(
      "/api/share/project/token-value/items/pano/image",
    );
    const visit = {
      id: "visit-1",
      occurredAt: "2026-09-18T15:00:00.000Z",
      dateLabel: "Sep 18, 2026",
      title: "Visit",
      kind: "site",
      kindLabel: "Site",
      sources: [{ rep: "thermal", label: "Thermal", sourceId: "t1", exploreHref: "/explore", imageHref: null }],
      plans: [],
      items: [{ id: "item-1", title: "Internal note", href: "/vnext/projects/project-a/items/item-1" }],
      itemCount: 1,
      thumbnailHref: null,
      frame: null,
    } satisfies VnextVisit;
    const thermal = { ...visit, id: "thermal-visit", kind: "thermal" as const };
    const prepared = preparePublicVisits([visit, thermal], "project-a", "token-value");
    expect(prepared).toEqual([]);
  });
});
