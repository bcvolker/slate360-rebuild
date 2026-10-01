import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

type ScriptedResult = { data: unknown; error: unknown };

let sessionUser: { id: string } | null;
let orgScript: { org_id: string; role?: string } | null;
let projectsScript: ScriptedResult[];
let membershipScript: { project_id: string; role?: string; role_id?: string } | null;
let tables: Record<string, ScriptedResult>;
const inserted: Array<{ table: string; row: unknown }> = [];
const triggered: string[] = [];

function asSingle(data: unknown) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

vi.mock("@trigger.dev/sdk/v3", () => ({
  tasks: {
    trigger: async (id: string) => {
      triggered.push(id);
      return { id: "run-1" };
    },
  },
}));

vi.mock("@/lib/s3", () => ({ BUCKET: "bucket", s3: {} }));
vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: async () => "https://files.example/put",
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    let projectsCallIndex = 0;
    const chain = (table: string, result: ScriptedResult) => {
      let fromInsert = false;
      const node: Record<string, unknown> = {
        select: () => node,
        eq: () => node,
        in: () => node,
        is: () => node,
        or: () => node,
        order: () => node,
        limit: () => node,
        insert: (row: unknown) => {
          inserted.push({ table, row });
          fromInsert = true;
          return node;
        },
        update: () => node,
        single: async () =>
          fromInsert
            ? { data: { id: `${table}-new` }, error: null }
            : { data: asSingle(result.data), error: result.error },
        maybeSingle: async () => ({ data: asSingle(result.data), error: result.error }),
        then: (resolve: (value: ScriptedResult) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject),
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
        return chain(table, tables[table] ?? { data: [], error: null });
      },
    };
  },
}));

const { GET, POST } = await import("@/app/api/vnext/projects/[projectId]/plans/route");

const PROJECT = { id: "p1", org_id: "org-a", name: "Harbor" };
const NOT_FOUND: ScriptedResult = { data: null, error: { message: "no rows" } };
const FOLDERS = [{ id: "f-draw", name: "Drawings", folder_type: "drawings", project_id: "p1" }];
// Plans is a sold service capability (off by default, unlike the base portal sections) — tests
// that expect plan data back need this row, matching a project where Plans is actually included.
const PLANS_INCLUDED: ScriptedResult = {
  data: [{ project_id: "p1", capability_id: "documents", included: true }, { project_id: "p1", capability_id: "plans", included: true }],
  error: null,
};
const FILE = {
  id: "file-1",
  file_name: "A1.pdf",
  file_size: 1200,
  s3_key: "orgs/org-a/f-draw/A1.pdf",
  folder_id: "f-draw",
  project_id: "p1",
  status: "pending",
  org_id: "org-a",
};

function req(url: string, body?: unknown) {
  return new NextRequest(new URL(url, "http://localhost"), {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

function authedOwner() {
  sessionUser = { id: "user-1" };
  orgScript = { org_id: "org-a", role: "owner" };
  projectsScript = [{ data: PROJECT, error: null }];
  membershipScript = null;
}

afterEach(() => {
  inserted.length = 0;
  triggered.length = 0;
});

describe("vNext project plans access", () => {
  it("returns project sheets without storage keys and omits another project's set", async () => {
    authedOwner();
    tables = {
      project_client_capabilities: PLANS_INCLUDED,
      project_folders: { data: FOLDERS, error: null },
      slatedrop_uploads: { data: [], error: null },
      site_walk_plan_sets: {
        data: [
          {
            id: "set-1",
            project_id: "p1",
            title: "Construction Drawings",
            kind: "master",
            revision_number: 1,
            revision_label: null,
            processing_status: "ready",
            source_file_id: null,
          },
          {
            id: "set-2",
            project_id: "p2",
            title: "Other",
            kind: "master",
            revision_number: 1,
            processing_status: "ready",
            source_file_id: null,
          },
        ],
        error: null,
      },
      site_walk_plan_sheets: {
        data: [
          {
            id: "sheet-1",
            project_id: "p1",
            plan_set_id: "set-1",
            sheet_name: "A1.01",
            sheet_number: 1,
            sort_order: 0,
            thumbnail_s3_key: null,
            rasterized_key: "orgs/secret/a.webp",
            image_s3_key: null,
          },
          {
            id: "sheet-2",
            project_id: "p2",
            plan_set_id: "set-2",
            sheet_name: "Foreign",
            sheet_number: 1,
            sort_order: 0,
            rasterized_key: "orgs/secret/b.webp",
          },
        ],
        error: null,
      },
    };
    const res = await GET(req("http://localhost/api/vnext/projects/p1/plans"), { params: Promise.resolve({ projectId: "p1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.planSets.map((set: { id: string }) => set.id)).toEqual(["set-1"]);
    expect(body.planSets[0].sheets[0].exploreHref).toContain("source=sheet-1");
    expect(JSON.stringify(body)).not.toContain("orgs/secret");
  });

  it("lets a project_members collaborator read and refuses their upload", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-home" };
    projectsScript = [NOT_FOUND, { data: PROJECT, error: null }];
    membershipScript = { project_id: "p1", role: "collaborator" };
    tables = {
      project_client_capabilities: PLANS_INCLUDED,
      project_folders: { data: [], error: null },
      site_walk_plan_sets: { data: [], error: null },
      site_walk_plan_sheets: { data: [], error: null },
    };
    const read = await GET(req("http://localhost/api/vnext/projects/p1/plans"), { params: Promise.resolve({ projectId: "p1" }) });
    expect(read.status).toBe(200);
    const write = await POST(req("http://localhost/api/vnext/projects/p1/plans", { fileId: "file-1", pageCount: 1 }), {
      params: Promise.resolve({ projectId: "p1" }),
    });
    expect(write.status).toBe(403);
    expect(inserted.map((entry) => entry.table)).not.toContain("site_walk_plan_sets");
  });

  it("refuses an unauthorized user before reading plans", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-other" };
    projectsScript = [NOT_FOUND];
    membershipScript = null;
    tables = { site_walk_plan_sets: { data: [{ id: "set-1", project_id: "p1" }], error: null } };
    const res = await GET(req("http://localhost/api/vnext/projects/p1/plans"), { params: Promise.resolve({ projectId: "p1" }) });
    expect(res.status).toBe(404);
    expect(inserted).toEqual([]);
  });

  it("does not create a plan set from a file in another project", async () => {
    authedOwner();
    tables = {
      project_folders: { data: FOLDERS, error: null },
      slatedrop_uploads: { data: { ...FILE, project_id: "p2" }, error: null },
    };
    const res = await POST(req("http://localhost/api/vnext/projects/p1/plans", { fileId: "file-1", pageCount: 2 }), {
      params: Promise.resolve({ projectId: "p1" }),
    });
    expect(res.status).toBe(404);
    expect(inserted.map((entry) => entry.table)).not.toContain("site_walk_plan_sets");
    expect(triggered).toEqual([]);
  });

  it("creates a project-scoped plan set for a manager and starts rasterization", async () => {
    authedOwner();
    tables = {
      project_folders: { data: FOLDERS, error: null },
      slatedrop_uploads: { data: FILE, error: null },
    };
    const res = await POST(req("http://localhost/api/vnext/projects/p1/plans", { fileId: "file-1", pageCount: 2 }), {
      params: Promise.resolve({ projectId: "p1" }),
    });
    expect(res.status).toBe(201);
    const planInsert = inserted.find((entry) => entry.table === "site_walk_plan_sets");
    expect(planInsert?.row).toMatchObject({ project_id: "p1", source_file_id: "file-1" });
    expect(JSON.stringify(planInsert?.row)).not.toContain("session_id");
    const sheetInsert = inserted.find((entry) => entry.table === "site_walk_plan_sheets");
    expect(sheetInsert?.row).toHaveLength(2);
    expect((sheetInsert?.row as Array<{ project_id: string }>)[0].project_id).toBe("p1");
    expect(triggered).toEqual(["plan.rasterize"]);
  });

  it("fails closed (404) when Plans is not an included client capability", async () => {
    authedOwner();
    tables = {
      // No project_client_capabilities row at all — Plans is a sold service capability, off by
      // default, unlike the base portal sections (documents/items/history/compare).
      project_folders: { data: FOLDERS, error: null },
      site_walk_plan_sets: { data: [{ id: "set-1", project_id: "p1" }], error: null },
      site_walk_plan_sheets: { data: [], error: null },
    };
    const res = await GET(req("http://localhost/api/vnext/projects/p1/plans"), { params: Promise.resolve({ projectId: "p1" }) });
    expect(res.status).toBe(404);
  });

  it("does not use Punchwalk auth", () => {
    for (const file of [
      "app/api/vnext/projects/[projectId]/plans/route.ts",
      "app/api/vnext/projects/[projectId]/plans/reserve/route.ts",
      "lib/vnext/plans/plan-upload.ts",
      "lib/vnext/plans/read-project-plans.ts",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("withAppAuth(");
      expect(source).not.toContain('"punchwalk"');
    }
  });
});
