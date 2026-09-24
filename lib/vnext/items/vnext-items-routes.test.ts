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
const recordedInserts: Array<{ table: string; row: Record<string, unknown> }> = [];

function asSingle(data: unknown) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    let projectsCallIndex = 0;
    const chain = (table: string, result: ScriptedResult) => {
      let inserted: Record<string, unknown> | null = null;
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
        insert: (row: Record<string, unknown>) => {
          inserted = row;
          recordedInserts.push({ table, row });
          return node;
        },
        single: async () =>
          inserted
            ? { data: { id: "comment-1", body: inserted.body, created_at: "2026-09-21T00:00:00.000Z", author_id: inserted.author_id }, error: null }
            : { data: asSingle(result.data), error: result.error },
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

const { GET: listGET } = await import("@/app/api/vnext/projects/[projectId]/items/route");
const { GET: detailGET } = await import("@/app/api/vnext/projects/[projectId]/items/[itemId]/route");
const { GET: questionsGET, POST: questionsPOST } = await import(
  "@/app/api/vnext/projects/[projectId]/items/[itemId]/questions/route"
);

const PROJECT = { id: "p1", org_id: "org-a", name: "Harbor" };
const NOT_FOUND: ScriptedResult = { data: null, error: { message: "no rows" } };
const ITEM = {
  id: "item-1",
  title: "East corridor",
  description: "Stain",
  item_type: "text_note",
  item_status: "open",
  priority: "medium",
  trade: null,
  category: null,
  tags: ["ceiling"],
  location_label: "Level 2",
  latitude: null,
  longitude: null,
  captured_at: "2026-09-18T15:00:00.000Z",
  session_id: "s1",
  s3_key: "secret/key.jpg",
  before_item_id: null,
  project_id: "p1",
};

function req(url: string, body?: unknown) {
  return new NextRequest(new URL(url, "http://localhost"), {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
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
  recordedInserts.length = 0;
});

describe("vNext items access", () => {
  it("lets an organization member list project items without legacy fields", async () => {
    authedOrg();
    tables = { site_walk_items: { data: [ITEM], error: null }, site_walk_sessions: { data: [{ id: "s1" }], error: null } };
    const res = await listGET(req("http://localhost/api/vnext/projects/p1/items"), { params: Promise.resolve({ projectId: "p1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].title).toBe("East corridor");
    expect(JSON.stringify(body)).not.toMatch(/s3_key|org_id|punchwalk|Site Walk/i);
    expect(recordedEq).toContainEqual(["site_walk_items", "project_id", "p1"]);
  });

  it("lets the project creator list items", async () => {
    sessionUser = { id: "user-1" };
    orgScript = null;
    projectsScript = [{ data: PROJECT, error: null }];
    membershipScript = null;
    tables = { site_walk_items: { data: [], error: null } };
    const res = await listGET(req("http://localhost/api/vnext/projects/p1/items"), { params: Promise.resolve({ projectId: "p1" }) });
    expect(res.status).toBe(200);
  });

  it("lets a project_members collaborator list items", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-home" };
    projectsScript = [NOT_FOUND, { data: PROJECT, error: null }];
    membershipScript = { project_id: "p1" };
    tables = { site_walk_items: { data: [], error: null } };
    const res = await listGET(req("http://localhost/api/vnext/projects/p1/items"), { params: Promise.resolve({ projectId: "p1" }) });
    expect(res.status).toBe(200);
  });

  it("refuses an unauthorized user before reading items", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-other" };
    projectsScript = [NOT_FOUND];
    membershipScript = null;
    tables = { site_walk_items: { data: [ITEM], error: null } };
    const res = await listGET(req("http://localhost/api/vnext/projects/p1/items"), { params: Promise.resolve({ projectId: "p1" }) });
    expect(res.status).toBe(404);
    expect(queried).not.toContain("site_walk_items");
  });

  it("does not return an item id that belongs to another project", async () => {
    authedOrg();
    tables = { site_walk_items: { data: null, error: null } };
    const res = await detailGET(req("http://localhost/api/vnext/projects/p1/items/item-b"), {
      params: Promise.resolve({ projectId: "p1", itemId: "item-b" }),
    });
    expect(res.status).toBe(404);
    expect(recordedEq).toContainEqual(["site_walk_items", "project_id", "p1"]);
    expect(recordedEq).toContainEqual(["site_walk_items", "id", "item-b"]);
    expect(queried).not.toContain("site_walk_comments");
  });

  it("does not read comments for an item outside the project", async () => {
    authedOrg();
    tables = {
      site_walk_items: { data: null, error: null },
      site_walk_comments: { data: [{ id: "c-b", body: "secret", created_at: "2026-09-01T00:00:00.000Z", author_id: "u" }], error: null },
    };
    const res = await questionsGET(req("http://localhost/api/vnext/projects/p1/items/item-b/questions"), {
      params: Promise.resolve({ projectId: "p1", itemId: "item-b" }),
    });
    expect(res.status).toBe(404);
    expect(queried).not.toContain("site_walk_comments");
  });

  it("refuses to attach a question to a session from another project", async () => {
    authedOrg();
    tables = {
      site_walk_items: { data: { id: "item-1", session_id: "s1", org_id: "org-a", project_id: "p1" }, error: null },
      site_walk_sessions: { data: null, error: null },
    };
    const res = await questionsPOST(
      req("http://localhost/api/vnext/projects/p1/items/item-1/questions", { body: "hello", sessionId: "session-b" }),
      { params: Promise.resolve({ projectId: "p1", itemId: "item-1" }) },
    );
    expect(res.status).toBe(404);
    expect(recordedInserts).toEqual([]);
  });

  it("writes a trimmed question on the item's own session", async () => {
    authedOrg();
    tables = {
      site_walk_items: { data: { id: "item-1", session_id: "s1", org_id: "org-a", project_id: "p1" }, error: null },
      site_walk_sessions: { data: { id: "s1" }, error: null },
      profiles: { data: [{ id: "user-1", display_name: "Ada" }], error: null },
    };
    const res = await questionsPOST(
      req("http://localhost/api/vnext/projects/p1/items/item-1/questions", { body: "  Is the stain active?  ", sessionId: "session-b" }),
      { params: Promise.resolve({ projectId: "p1", itemId: "item-1" }) },
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.question.body).toBe("Is the stain active?");
    expect(body.question.authorLabel).toBe("Ada");
    expect(recordedInserts[0]?.row).toMatchObject({
      project_id: "p1",
      session_id: "s1",
      item_id: "item-1",
      body: "Is the stain active?",
      is_escalation: false,
    });
  });

  it("fails closed (404) on list, detail, and questions when Items is excluded from client scope", async () => {
    authedOrg();
    const itemsExcluded = {
      data: [{ project_id: "p1", capability_id: "items", included: false }],
      error: null,
    };
    tables = { project_client_capabilities: itemsExcluded, site_walk_items: { data: [ITEM], error: null } };

    const list = await listGET(req("http://localhost/api/vnext/projects/p1/items"), { params: Promise.resolve({ projectId: "p1" }) });
    expect(list.status).toBe(404);

    const detail = await detailGET(req("http://localhost/api/vnext/projects/p1/items/item-1"), {
      params: Promise.resolve({ projectId: "p1", itemId: "item-1" }),
    });
    expect(detail.status).toBe(404);

    const questions = await questionsGET(req("http://localhost/api/vnext/projects/p1/items/item-1/questions"), {
      params: Promise.resolve({ projectId: "p1", itemId: "item-1" }),
    });
    expect(questions.status).toBe(404);
  });

  it("does not depend on the punchwalk entitlement, and the legacy comment route still does", () => {
    const sources = [
      "app/api/vnext/projects/[projectId]/items/route.ts",
      "app/api/vnext/projects/[projectId]/items/[itemId]/route.ts",
      "app/api/vnext/projects/[projectId]/items/[itemId]/questions/route.ts",
      "lib/vnext/items/read-project-items.ts",
      "lib/vnext/items/item-questions.ts",
    ];
    for (const file of sources) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("withAppAuth(");
      expect(source).not.toContain('"punchwalk"');
    }
    expect(readFileSync("app/api/site-walk/comments/route.ts", "utf8")).toContain('withAppAuth("punchwalk"');
  });
});
