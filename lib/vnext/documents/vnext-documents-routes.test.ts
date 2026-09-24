import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

type ScriptedResult = { data: unknown; error: unknown };

let sessionUser: { id: string } | null;
let orgScript: { org_id: string } | null;
let projectsScript: ScriptedResult[];
let membershipScript: { project_id: string } | null;
let tables: Record<string, ScriptedResult>;
const recordedEq: Array<[string, string, unknown]> = [];
const queried: string[] = [];
const signed: string[] = [];

function asSingle(data: unknown) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
}));

vi.mock("@/lib/s3", () => ({ BUCKET: "bucket", s3: {} }));
vi.mock("@aws-sdk/client-s3", () => ({
  GetObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: async (_client: unknown, command: { input: { Key: string } }) => {
    signed.push(command.input.Key);
    return "https://files.example/signed";
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    let projectsCallIndex = 0;
    const chain = (table: string, result: ScriptedResult) => {
      const node: Record<string, unknown> = {
        select: () => node,
        eq: (col: string, val: unknown) => {
          recordedEq.push([table, col, val]);
          return node;
        },
        in: () => node,
        is: () => node,
        or: () => node,
        order: () => node,
        limit: () => node,
        single: async () => ({ data: asSingle(result.data), error: result.error }),
        maybeSingle: async () => ({ data: asSingle(result.data), error: result.error }),
        then: (resolve: (value: ScriptedResult) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject),
      };
      return node;
    };
    return {
      from(table: string) {
        queried.push(table);
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

const { GET: listGET } = await import("@/app/api/vnext/projects/[projectId]/documents/route");
const { GET: detailGET } = await import("@/app/api/vnext/projects/[projectId]/documents/[documentId]/route");
const { GET: fileGET } = await import("@/app/api/vnext/projects/[projectId]/documents/[documentId]/file/route");

const PROJECT = { id: "p1", org_id: "org-a", name: "Harbor" };
const NOT_FOUND: ScriptedResult = { data: null, error: { message: "no rows" } };
const FOLDERS = [
  { id: "f-draw", name: "Drawings", folder_type: "drawings", project_id: "p1" },
  { id: "f-lidar", name: "LiDAR", folder_type: "twin_lidar", project_id: "p1" },
];
const PDF = {
  id: "doc-1",
  file_name: "Level 2.pdf",
  file_size: 1200,
  file_type: "application/pdf",
  folder_id: "f-draw",
  project_id: "p1",
  s3_key: "orgs/secret/level2.pdf",
  created_at: "2026-09-18T15:00:00.000Z",
  status: "active",
  deleted_at: null,
};

function req(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

function authedOrg() {
  sessionUser = { id: "user-1" };
  orgScript = { org_id: "org-a" };
  projectsScript = [{ data: PROJECT, error: null }];
  membershipScript = null;
}

afterEach(() => {
  recordedEq.length = 0;
  queried.length = 0;
  signed.length = 0;
});

describe("vNext documents access", () => {
  it("lets an organization member list client documents without storage keys", async () => {
    authedOrg();
    tables = {
      project_folders: { data: FOLDERS, error: null },
      slatedrop_uploads: {
        data: [PDF, { ...PDF, id: "raw", file_name: "scan.las", folder_id: "f-lidar", s3_key: "orgs/secret/scan.las" }],
        error: null,
      },
    };
    const res = await listGET(req("http://localhost/api/vnext/projects/p1/documents"), {
      params: Promise.resolve({ projectId: "p1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.documents.map((document: { id: string }) => document.id)).toEqual(["doc-1"]);
    expect(JSON.stringify(body)).not.toMatch(/s3_key|orgs\/secret|punchwalk|SlateDrop/i);
    expect(recordedEq).toContainEqual(["project_folders", "project_id", "p1"]);
  });

  it("lets the project creator list documents", async () => {
    sessionUser = { id: "user-1" };
    orgScript = null;
    projectsScript = [{ data: PROJECT, error: null }];
    membershipScript = null;
    tables = { project_folders: { data: [], error: null } };
    const res = await listGET(req("http://localhost/api/vnext/projects/p1/documents"), {
      params: Promise.resolve({ projectId: "p1" }),
    });
    expect(res.status).toBe(200);
  });

  it("lets a project_members collaborator list documents", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-home" };
    projectsScript = [NOT_FOUND, { data: PROJECT, error: null }];
    membershipScript = { project_id: "p1" };
    tables = { project_folders: { data: [], error: null } };
    const res = await listGET(req("http://localhost/api/vnext/projects/p1/documents"), {
      params: Promise.resolve({ projectId: "p1" }),
    });
    expect(res.status).toBe(200);
  });

  it("refuses an unauthorized user before reading documents", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-other" };
    projectsScript = [NOT_FOUND];
    membershipScript = null;
    tables = { slatedrop_uploads: { data: [PDF], error: null }, project_folders: { data: FOLDERS, error: null } };
    const res = await listGET(req("http://localhost/api/vnext/projects/p1/documents"), {
      params: Promise.resolve({ projectId: "p1" }),
    });
    expect(res.status).toBe(404);
    expect(queried).not.toContain("slatedrop_uploads");
  });

  it("does not return a document id from another project", async () => {
    authedOrg();
    tables = {
      project_folders: { data: FOLDERS, error: null },
      slatedrop_uploads: { data: [{ ...PDF, id: "doc-b", project_id: "p2" }], error: null },
    };
    const res = await detailGET(req("http://localhost/api/vnext/projects/p1/documents/doc-b"), {
      params: Promise.resolve({ projectId: "p1", documentId: "doc-b" }),
    });
    expect(res.status).toBe(404);
  });

  it("does not sign a file that is outside the project", async () => {
    authedOrg();
    tables = {
      project_folders: { data: FOLDERS, error: null },
      slatedrop_uploads: { data: { ...PDF, project_id: "p2" }, error: null },
    };
    const res = await fileGET(req("http://localhost/api/vnext/projects/p1/documents/doc-1/file"), {
      params: Promise.resolve({ projectId: "p1", documentId: "doc-1" }),
    });
    expect(res.status).toBe(404);
    expect(signed).toEqual([]);
  });

  it("signs only a client file that belongs to the project", async () => {
    authedOrg();
    tables = {
      project_folders: { data: FOLDERS, error: null },
      slatedrop_uploads: { data: PDF, error: null },
    };
    const res = await fileGET(req("http://localhost/api/vnext/projects/p1/documents/doc-1/file?disposition=inline"), {
      params: Promise.resolve({ projectId: "p1", documentId: "doc-1" }),
    });
    expect(res.status).toBe(307);
    expect(signed).toEqual(["orgs/secret/level2.pdf"]);
    expect(res.headers.get("location")).toBe("https://files.example/signed");
  });

  it("fails closed (404) on list, detail, and file when Documents is excluded from client scope", async () => {
    authedOrg();
    const documentsExcluded = {
      data: [{ project_id: "p1", capability_id: "documents", included: false }],
      error: null,
    };
    tables = {
      project_client_capabilities: documentsExcluded,
      project_folders: { data: FOLDERS, error: null },
      slatedrop_uploads: { data: [PDF], error: null },
    };

    const list = await listGET(req("http://localhost/api/vnext/projects/p1/documents"), {
      params: Promise.resolve({ projectId: "p1" }),
    });
    expect(list.status).toBe(404);

    const detail = await detailGET(req("http://localhost/api/vnext/projects/p1/documents/doc-1"), {
      params: Promise.resolve({ projectId: "p1", documentId: "doc-1" }),
    });
    expect(detail.status).toBe(404);

    const file = await fileGET(req("http://localhost/api/vnext/projects/p1/documents/doc-1/file"), {
      params: Promise.resolve({ projectId: "p1", documentId: "doc-1" }),
    });
    expect(file.status).toBe(404);
    expect(signed).toEqual([]);
  });

  it("does not require a SlateDrop entitlement, and the legacy download route still scopes by org", () => {
    const sources = [
      "app/api/vnext/projects/[projectId]/documents/route.ts",
      "app/api/vnext/projects/[projectId]/documents/[documentId]/route.ts",
      "app/api/vnext/projects/[projectId]/documents/[documentId]/file/route.ts",
      "lib/vnext/documents/read-project-documents.ts",
    ];
    for (const file of sources) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("withAppAuth(");
      expect(source).not.toContain('"punchwalk"');
    }
    const legacy = readFileSync("app/api/slatedrop/download/route.ts", "utf8");
    expect(legacy).toContain('eq("org_id", orgId)');
  });
});
