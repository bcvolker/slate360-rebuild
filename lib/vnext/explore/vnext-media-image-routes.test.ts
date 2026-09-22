import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Route-level coverage for the two new vNext-scoped, redirect-to-presigned-URL media routes
 * (Slice 4 correction): items/image (360 photos) and plan-sheets/image (plan sheets). Both replace
 * a legacy route gated by withAppAuth("punchwalk") + a single-org match, which could refuse a
 * legitimate project_members collaborator. Proves: (1) a cross-org project_members collaborator
 * still gets the asset, (2) a source id belonging to a DIFFERENT project is refused — the query is
 * scoped by project_id, so the row simply isn't found, (3) the route source has no dependency on
 * withAppAuth/"punchwalk" at all (static check — the strongest guarantee that legacy gating can't
 * silently creep back in).
 */
type ScriptedResult = { data: unknown; error: unknown };

let sessionUser: { id: string } | null;
let orgScript: { org_id: string } | null;
let projectsScript: ScriptedResult[];
let membershipScript: { project_id: string } | null;
let mediaTableScript: Record<string, ScriptedResult>;
const recordedEq: Array<[string, string, unknown]> = [];

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    let projectsCallIndex = 0;
    const chain = (table: string, result: ScriptedResult) => {
      const node = {
        select: () => node,
        eq: (col: string, val: unknown) => {
          recordedEq.push([table, col, val]);
          return node;
        },
        or: () => node,
        limit: () => node,
        is: () => node,
        in: () => node,
        single: async () => result,
        maybeSingle: async () => result,
        then: (resolve: (value: ScriptedResult) => void) => resolve(result),
      };
      return node;
    };
    return {
      from(table: string) {
        if (table === "organization_members") return chain(table, { data: orgScript, error: null });
        if (table === "project_members") return chain(table, { data: membershipScript, error: null });
        if (table === "projects") {
          const result = projectsScript[Math.min(projectsCallIndex, projectsScript.length - 1)];
          projectsCallIndex += 1;
          return chain(table, result);
        }
        const result = mediaTableScript[table] ?? { data: null, error: null };
        return chain(table, result);
      },
    };
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(async () => "https://signed.example/asset.jpg"),
}));
vi.mock("@aws-sdk/client-s3", () => ({
  GetObjectCommand: vi.fn(function GetObjectCommand(this: Record<string, unknown>, args: Record<string, unknown>) {
    Object.assign(this, args);
  }),
}));
vi.mock("@/lib/s3", () => ({ BUCKET: "test-bucket", s3: {} }));

const { GET: itemsGET } = await import("@/app/api/vnext/projects/[projectId]/items/[itemId]/image/route");
const { GET: sheetsGET } = await import("@/app/api/vnext/projects/[projectId]/plan-sheets/[sheetId]/image/route");

const AUTHORIZED_PROJECT = { id: "p1", org_id: "org-owner", name: "P1" };

function req(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

afterEach(() => {
  recordedEq.length = 0;
});

describe("vNext-scoped items/image route", () => {
  it("serves the image to a cross-org project_members collaborator", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-collaborator-home" };
    projectsScript = [
      { data: null, error: { message: "no rows" } },
      { data: AUTHORIZED_PROJECT, error: null },
    ];
    membershipScript = { project_id: "p1" };
    mediaTableScript = {
      site_walk_items: { data: { s3_key: "orgs/x/a.jpg", item_type: "photo_360", title: "East stair" }, error: null },
      project_client_capabilities: {
        data: [{ project_id: "p1", capability_id: "pano360", included: true }],
        error: null,
      },
    };

    const res = await itemsGET(req("http://localhost/api/vnext/projects/p1/items/item-1/image"), {
      params: Promise.resolve({ projectId: "p1", itemId: "item-1" }),
    });

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://signed.example/asset.jpg");
    // The security-critical guarantee: the media query is scoped to the authorized project.
    expect(recordedEq).toContainEqual(["site_walk_items", "project_id", "p1"]);
  });

  it("refuses an item id that belongs to a different project", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-owner" };
    projectsScript = [{ data: AUTHORIZED_PROJECT, error: null }];
    membershipScript = null;
    // The item exists, but not under project p1 — the project_id-scoped query returns nothing.
    mediaTableScript = { site_walk_items: { data: null, error: null } };

    const res = await itemsGET(req("http://localhost/api/vnext/projects/p1/items/item-from-other-project/image"), {
      params: Promise.resolve({ projectId: "p1", itemId: "item-from-other-project" }),
    });

    expect(res.status).toBe(404);
  });

  it("refuses an unauthorized user before ever querying the media table", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-unrelated" };
    projectsScript = [{ data: null, error: { message: "no rows" } }];
    membershipScript = null;
    mediaTableScript = { site_walk_items: { data: { s3_key: "orgs/x/a.jpg" }, error: null } };

    const res = await itemsGET(req("http://localhost/api/vnext/projects/p1/items/item-1/image"), {
      params: Promise.resolve({ projectId: "p1", itemId: "item-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("has no dependency on withAppAuth or the punchwalk entitlement", () => {
    // Checks the actual code tokens (a call and a quoted app-id literal), not prose — this file's
    // own comments legitimately discuss "punchwalk" while explaining what was fixed and why.
    const source = readFileSync(
      "app/api/vnext/projects/[projectId]/items/[itemId]/image/route.ts",
      "utf8",
    );
    expect(source).not.toContain("withAppAuth(");
    expect(source).not.toContain('"punchwalk"');
  });
});

describe("vNext-scoped plan-sheets/image route", () => {
  it("serves the sheet image to a cross-org project_members collaborator", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-collaborator-home" };
    projectsScript = [
      { data: null, error: { message: "no rows" } },
      { data: AUTHORIZED_PROJECT, error: null },
    ];
    membershipScript = { project_id: "p1" };
    mediaTableScript = {
      site_walk_plan_sheets: {
        data: { sheet_name: "A1.0", image_s3_key: "orgs/x/a1.jpg", thumbnail_s3_key: null, rasterized_key: null },
        error: null,
      },
      project_client_capabilities: {
        data: [{ project_id: "p1", capability_id: "plans", included: true }],
        error: null,
      },
    };

    const res = await sheetsGET(req("http://localhost/api/vnext/projects/p1/plan-sheets/sheet-1/image"), {
      params: Promise.resolve({ projectId: "p1", sheetId: "sheet-1" }),
    });

    expect(res.status).toBe(307);
    expect(recordedEq).toContainEqual(["site_walk_plan_sheets", "project_id", "p1"]);
  });

  it("refuses a sheet id that belongs to a different project", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-owner" };
    projectsScript = [{ data: AUTHORIZED_PROJECT, error: null }];
    membershipScript = null;
    mediaTableScript = {
      site_walk_plan_sheets: { data: null, error: null },
      project_client_capabilities: {
        data: [{ project_id: "p1", capability_id: "plans", included: true }],
        error: null,
      },
    };

    const res = await sheetsGET(req("http://localhost/api/vnext/projects/p1/plan-sheets/other-project-sheet/image"), {
      params: Promise.resolve({ projectId: "p1", sheetId: "other-project-sheet" }),
    });

    expect(res.status).toBe(404);
  });

  it("has no dependency on withAppAuth or the punchwalk entitlement", () => {
    const source = readFileSync(
      "app/api/vnext/projects/[projectId]/plan-sheets/[sheetId]/image/route.ts",
      "utf8",
    );
    expect(source).not.toContain("withAppAuth(");
    expect(source).not.toContain('"punchwalk"');
  });
});
