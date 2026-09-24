import { describe, expect, it } from "vitest";
import { assembleProjectPlans, isPlanUploadFolder, rejectPlanFile, withPlanSheetLinks } from "./assemble-plans";
import { isProjectManageRole, userCanManageVnextProject } from "./manage-access";
import { visitPlanAnchors } from "./visit-plan-anchor";
import type { VnextClientDocument } from "@/lib/vnext/documents/document-types";

const document: VnextClientDocument = {
  id: "doc-1",
  displayName: "Architectural set",
  filename: "architectural-set.pdf",
  typeLabel: "PDF",
  extension: "pdf",
  sizeLabel: null,
  dateLabel: "Sep 1, 2026",
  folderId: "f1",
  folderLabel: "Drawings",
  canOpen: true,
  canDownload: true,
  openHref: "/file",
  downloadHref: "/file",
  previewHref: null,
  related: null,
};

describe("project plan assembly", () => {
  it("keeps renderable project sheets and links the source document", () => {
    const sets = assembleProjectPlans(
      "p1",
      [
        {
          id: "set-1",
          projectId: "p1",
          title: "Construction Drawings",
          kind: "master",
          revisionNumber: 2,
          revisionLabel: null,
          processingStatus: "ready",
          sourceFileId: "doc-1",
          archived: false,
        },
        {
          id: "set-other",
          projectId: "p2",
          title: "Other project",
          kind: "master",
          revisionNumber: 1,
          revisionLabel: null,
          processingStatus: "ready",
          sourceFileId: "doc-1",
          archived: false,
        },
      ],
      [
        {
          id: "sheet-ok",
          projectId: "p1",
          planSetId: "set-1",
          sheetName: "A1.01",
          sheetNumber: 1,
          sortOrder: 0,
          thumbnailKey: null,
          rasterizedKey: "orgs/secret/sheet.webp",
          imageKey: null,
        },
        {
          id: "sheet-wait",
          projectId: "p1",
          planSetId: "set-1",
          sheetName: "A2.12",
          sheetNumber: 2,
          sortOrder: 1,
          thumbnailKey: null,
          rasterizedKey: null,
          imageKey: null,
        },
      ],
      [document],
      "/vnext/projects/p1/documents",
      "/vnext/projects/p1/explore",
    );
    expect(sets.map((set) => set.id)).toEqual(["set-1"]);
    expect(sets[0].revisionLabel).toBe("Rev 2");
    expect(sets[0].source?.href).toBe("/vnext/projects/p1/documents/doc-1");
    expect(sets[0].sheets[0].exploreHref).toContain("rep=plan");
    expect(sets[0].sheets[0].exploreHref).toContain("source=sheet-ok");
    expect(sets[0].sheets[1].exploreHref).toBeNull();
    expect(sets[0].sheets[1].statusLabel).toBe("Preparing");
    expect(JSON.stringify(sets)).not.toContain("orgs/secret");
  });

  it("does not treat a failed sheet as an Explore source", () => {
    const [set] = assembleProjectPlans(
      "p1",
      [
        {
          id: "set-1",
          projectId: "p1",
          title: "Permit set",
          kind: "master",
          revisionNumber: 1,
          revisionLabel: "Rev 0",
          processingStatus: "failed",
          sourceFileId: null,
          archived: false,
        },
      ],
      [
        {
          id: "sheet-bad",
          projectId: "p1",
          planSetId: "set-1",
          sheetName: null,
          sheetNumber: 1,
          sortOrder: 0,
          thumbnailKey: null,
          rasterizedKey: null,
          imageKey: null,
        },
      ],
      [],
      "/documents",
      "/explore",
    );
    expect(set.revisionLabel).toBe("Rev 0");
    expect(set.source).toBeNull();
    expect(set.sheets[0].exploreHref).toBeNull();
    expect(set.sheets[0].statusLabel).toBe("Could not be prepared");
  });

  it("points the source document at its sheets", () => {
    const [linked] = withPlanSheetLinks(
      [document],
      [
        {
          id: "set-1",
          title: "Construction Drawings",
          revisionLabel: null,
          source: { documentId: "doc-1", title: "Architectural set", href: "/documents/doc-1" },
          sheets: [],
        },
      ],
      "/documents",
    );
    expect(linked.sheetsHref).toBe("/documents#plan-set-1");
  });

  it("accepts drawings and plan folders only", () => {
    expect(isPlanUploadFolder({ folderType: "drawings", name: "Drawings" })).toBe(true);
    expect(isPlanUploadFolder({ folderType: "site_walk_plans", name: "Plans" })).toBe(true);
    expect(isPlanUploadFolder({ folderType: null, name: "02_Drawings" })).toBe(true);
    expect(isPlanUploadFolder({ folderType: "twin_lidar", name: "LiDAR" })).toBe(false);
  });
});

describe("visit plan anchors", () => {
  it("lets two visits reference the same project sheet at different positions", () => {
    const anchors = visitPlanAnchors(
      "p1",
      [{ id: "sheet-1", planSetId: "set-1", projectId: "p1" }],
      [
        { sessionId: "sep-1", planSheetId: "sheet-1" },
        { sessionId: "sep-15", planSheetId: "sheet-1" },
        { sessionId: "oct-1", planSheetId: "sheet-other" },
      ],
      [
        { sessionId: "sep-1", planSheetId: "sheet-1", projectId: "p1", xPct: 0.2, yPct: 0.4 },
        { sessionId: "sep-15", planSheetId: "sheet-1", projectId: "p1", xPct: 0.8, yPct: 0.1 },
        { sessionId: "oct-1", planSheetId: "sheet-other", projectId: "p2", xPct: 0.5, yPct: 0.5 },
      ],
    );
    expect(anchors).toEqual([
      { sessionId: "sep-1", planSetId: "set-1", planSheetId: "sheet-1", xPct: 0.2, yPct: 0.4 },
      { sessionId: "sep-15", planSetId: "set-1", planSheetId: "sheet-1", xPct: 0.8, yPct: 0.1 },
    ]);
  });
});

describe("plan write permission", () => {
  it("matches the manage-role list and excludes collaborator and viewer", () => {
    expect(isProjectManageRole("owner")).toBe(true);
    expect(isProjectManageRole("Admin")).toBe(true);
    expect(isProjectManageRole("member")).toBe(true);
    expect(isProjectManageRole("manager")).toBe(true);
    expect(isProjectManageRole("collaborator")).toBe(false);
    expect(isProjectManageRole("viewer")).toBe(false);
    expect(isProjectManageRole(null)).toBe(false);
  });

  it("uses the project org role before a collaborator membership", async () => {
    const allowed = await userCanManageVnextProject(roleAdmin({ role: "owner" }, { role: "collaborator" }), "user-1", "p1", "org-a");
    const denied = await userCanManageVnextProject(roleAdmin(null, { role_id: "viewer" }), "user-1", "p1", "org-a");
    expect(allowed).toBe(true);
    expect(denied).toBe(false);
  });
});

describe("plan file checks", () => {
  it("rejects non-pdf and oversized files", () => {
    expect(rejectPlanFile("photo.jpg", 1000, 1)?.status).toBe(400);
    expect(rejectPlanFile("set.pdf", 51 * 1024 * 1024, 1)?.error).toMatch(/50 MB/);
    expect(rejectPlanFile("set.pdf", 1000, 0)?.status).toBe(400);
    expect(rejectPlanFile("set.pdf", 1000, 3)).toBeNull();
  });
});

function roleAdmin(org: { role?: string | null; role_id?: string | null } | null, member: { role?: string | null; role_id?: string | null } | null) {
  return {
    from(table: string) {
      const data = table === "organization_members" ? org : member;
      const node = {
        select: () => node,
        eq: () => node,
        maybeSingle: async () => ({ data, error: null }),
      };
      return node;
    },
  };
}
