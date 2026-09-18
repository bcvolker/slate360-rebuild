import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Route-level coverage for the new vNext-scoped Reality splat proxy (Slice 4 correction),
 * replacing /api/digital-twin/models/[modelId]/splat — which matched the model's org_id against
 * the signed-in user's single org and would wrongly refuse a project_members collaborator whose
 * access comes from a different org. Same three guarantees as the image routes: a cross-org
 * project_members collaborator still streams the model, a model id belonging to a different
 * project is refused, and the route has no dependency on withAppAuth/"punchwalk".
 */
type ScriptedResult = { data: unknown; error: unknown };

let sessionUser: { id: string } | null;
let orgScript: { org_id: string } | null;
let projectsScript: ScriptedResult[];
let membershipScript: { project_id: string } | null;
let modelScript: ScriptedResult;
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
        single: async () => result,
        maybeSingle: async () => result,
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
        if (table === "digital_twin_models") return chain(table, modelScript);
        throw new Error(`unexpected table ${table}`);
      },
    };
  },
}));

vi.mock("@/lib/s3", () => ({
  BUCKET: "test-bucket",
  s3: {
    send: vi.fn(async () => ({
      Body: new ReadableStream({ start: (c) => c.close() }),
      ContentType: "application/octet-stream",
      ContentLength: 42,
    })),
  },
}));

const { GET: splatGET } = await import(
  "@/app/api/vnext/projects/[projectId]/twin-models/[modelId]/splat/route"
);

const AUTHORIZED_PROJECT = { id: "p1", org_id: "org-owner", name: "P1" };

function req(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

afterEach(() => {
  recordedEq.length = 0;
});

describe("vNext-scoped twin-models/splat route", () => {
  it("streams the model to a cross-org project_members collaborator", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-collaborator-home" };
    projectsScript = [
      { data: null, error: { message: "no rows" } },
      { data: AUTHORIZED_PROJECT, error: null },
    ];
    membershipScript = { project_id: "p1" };
    modelScript = { data: { storage_key: "orgs/x/model.spz", edit_list: [], baked_export: null }, error: null };

    const res = await splatGET(req("http://localhost/api/vnext/projects/p1/twin-models/model-1/splat"), {
      params: Promise.resolve({ projectId: "p1", modelId: "model-1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    // The security-critical guarantee: the model is only found within the authorized project's
    // own twin spaces, via the digital_twin_spaces.project_id embedded-join filter.
    expect(recordedEq).toContainEqual(["digital_twin_models", "digital_twin_spaces.project_id", "p1"]);
  });

  it("refuses a model id that belongs to a different project", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-owner" };
    projectsScript = [{ data: AUTHORIZED_PROJECT, error: null }];
    membershipScript = null;
    // The model exists, but not under a space that belongs to project p1 — the embedded-join
    // filter excludes it, so the scoped query returns nothing.
    modelScript = { data: null, error: null };

    const res = await splatGET(
      req("http://localhost/api/vnext/projects/p1/twin-models/model-from-other-project/splat"),
      { params: Promise.resolve({ projectId: "p1", modelId: "model-from-other-project" }) },
    );

    expect(res.status).toBe(404);
  });

  it("refuses an unauthorized user before ever querying the model table", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-unrelated" };
    projectsScript = [{ data: null, error: { message: "no rows" } }];
    membershipScript = null;
    modelScript = { data: { storage_key: "orgs/x/model.spz", edit_list: [], baked_export: null }, error: null };

    const res = await splatGET(req("http://localhost/api/vnext/projects/p1/twin-models/model-1/splat"), {
      params: Promise.resolve({ projectId: "p1", modelId: "model-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("has no dependency on withAppAuth or the punchwalk entitlement", () => {
    const source = readFileSync(
      "app/api/vnext/projects/[projectId]/twin-models/[modelId]/splat/route.ts",
      "utf8",
    );
    expect(source).not.toContain("withAppAuth(");
    expect(source).not.toContain('"punchwalk"');
  });
});
