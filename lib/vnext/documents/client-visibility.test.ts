import { describe, expect, it } from "vitest";
import { assembleClientDocument, clientFolderMap, isClientFile } from "./assemble-document";
import { folderDisplayLabel, isClientDocumentFolder } from "./client-visibility";
import { filterSearchHits } from "./project-search";
import type { VnextSearchHit } from "./document-types";

describe("client document folders", () => {
  it("keeps published drawing folders and hides capture and reconstruction folders", () => {
    expect(isClientDocumentFolder({ folderType: "drawings", name: "Drawings" })).toBe(true);
    expect(isClientDocumentFolder({ folderType: "site_walk_deliverables", name: "Deliverables" })).toBe(true);
    expect(isClientDocumentFolder({ folderType: "site_walk_photos", name: "Photos" })).toBe(false);
    expect(isClientDocumentFolder({ folderType: "twin_lidar", name: "LiDAR" })).toBe(false);
    expect(isClientDocumentFolder({ folderType: "twin_source_assets", name: "Source_Assets" })).toBe(false);
    expect(isClientDocumentFolder({ folderType: "contracts", name: "Contracts" })).toBe(false);
    expect(isClientDocumentFolder({ folderType: null, name: "Plans" })).toBe(true);
    expect(isClientDocumentFolder({ folderType: null, name: "Photos" })).toBe(false);
    expect(folderDisplayLabel("02_Site_Walk")).toBe("Site Walk");
  });

  it("drops another project's file, a sentinel, and a file outside a client folder", () => {
    const folders = clientFolderMap(
      [
        { id: "draw", name: "Drawings", folderType: "drawings", projectId: "p1" },
        { id: "lidar", name: "LiDAR", folderType: "twin_lidar", projectId: "p1" },
        { id: "other", name: "Drawings", folderType: "drawings", projectId: "p2" },
      ],
      "p1",
    );
    expect([...folders.keys()]).toEqual(["draw"]);
    const base = {
      fileName: "a.pdf",
      fileSize: 10,
      fileType: null,
      createdAt: "2026-09-18T00:00:00.000Z",
      status: "active",
    };
    expect(isClientFile({ ...base, id: "1", folderId: "draw", projectId: "p1", s3Key: "orgs/a/draw/a.pdf" }, folders, "p1")).toBe(true);
    expect(isClientFile({ ...base, id: "2", folderId: "draw", projectId: "p2", s3Key: "orgs/a/draw/b.pdf" }, folders, "p1")).toBe(false);
    expect(isClientFile({ ...base, id: "3", folderId: "lidar", projectId: "p1", s3Key: "orgs/a/lidar/c.las" }, folders, "p1")).toBe(false);
    expect(
      isClientFile({ ...base, id: "4", folderId: "draw", projectId: "p1", s3Key: "deliverable://abc" }, folders, "p1"),
    ).toBe(false);
  });

  it("does not put a storage key on the client document", () => {
    const document = assembleClientDocument(
      {
        id: "doc-1",
        fileName: "Level 2.pdf",
        fileSize: 2048,
        fileType: null,
        folderId: "draw",
        projectId: "p1",
        s3Key: "orgs/secret/draw/Level 2.pdf",
        createdAt: "2026-09-18T00:00:00.000Z",
        status: "active",
      },
      { id: "draw", name: "Drawings", folderType: "drawings", projectId: "p1" },
      { projectId: "p1", dateLabel: "Sep 18, 2026", related: null },
    );
    expect(document.typeLabel).toBe("PDF");
    expect(document.canOpen).toBe(true);
    expect(document.openHref).toContain("disposition=inline");
    expect(JSON.stringify(document)).not.toContain("orgs/secret");
  });
});

describe("project search", () => {
  const hits: VnextSearchHit[] = [
    { id: "d1", kind: "document", title: "Level 2 reflected ceiling", context: "Document · PDF", href: "/documents/d1", searchText: "level 2 reflected ceiling pdf drawings" },
    { id: "i1", kind: "item", title: "Water stain", context: "Item · Level 2", href: "/items/i1", searchText: "water stain level 2 corridor" },
    { id: "s1", kind: "plan", title: "A2.12 Level 2", context: "Plan", href: "/explore?rep=plan&source=s1", searchText: "a2.12 level 2 plan" },
  ];

  it("returns only matching kinds and never an empty query", () => {
    expect(filterSearchHits(hits, "   ", "all")).toEqual([]);
    expect(filterSearchHits(hits, "level 2", "plan").map((hit) => hit.id)).toEqual(["s1"]);
    expect(filterSearchHits(hits, "corridor", "all").map((hit) => hit.kind)).toEqual(["item"]);
  });
});
