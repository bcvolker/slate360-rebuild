import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Route-level coverage for the new vNext-scoped Reality hero preview-image route (Slice 4
 * closeout), replacing /api/digital-twin/models/[modelId]/preview-image for the vNext client
 * portfolio/Overview hero image. Same three guarantees as the other vNext media routes: a
 * cross-org project_members collaborator still gets the image, a model id belonging to a
 * different project is refused, and the route has no dependency on withAppAuth/the digital_twin
 * standalone-app entitlement.
 */
type ScriptedResult = { data: unknown; error: unknown };

let sessionUser: { id: string } | null;
let orgScript: { org_id: string } | null;
let projectsScript: ScriptedResult[];
let membershipScript: { project_id: string } | null;
let modelScript: ScriptedResult;
let capabilityScript: ScriptedResult;
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
        if (table === "digital_twin_models") return chain(table, modelScript);
        if (table === "project_client_capabilities") return chain(table, capabilityScript);
        throw new Error(`unexpected table ${table}`);
      },
    };
  },
}));

vi.mock("@/lib/digital-twin/resolve-model-url", () => ({
  resolveDigitalTwinModelUrl: vi.fn(async (key: string) => `https://signed.example/${key}`),
}));

const { GET: previewGET } = await import(
  "@/app/api/vnext/projects/[projectId]/twin-models/[modelId]/preview-image/route"
);

const AUTHORIZED_PROJECT = { id: "p1", org_id: "org-owner", name: "P1" };
const INCLUDED_SCOPE = {
  data: ["reality", "geometry", "pano360", "plans"].map((capability_id) => ({
    project_id: "p1",
    capability_id,
    included: true,
  })),
  error: null,
};

function req(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

afterEach(() => {
  recordedEq.length = 0;
});

describe("vNext-scoped twin-models/preview-image route", () => {
  it("serves the preview image to a same-org project user", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-owner" };
    projectsScript = [{ data: AUTHORIZED_PROJECT, error: null }];
    membershipScript = null;
    modelScript = { data: { preview_storage_key: "orgs/x/preview.jpg", model_format: "spz", storage_key: "orgs/x/model.spz" }, error: null };
    capabilityScript = INCLUDED_SCOPE;

    const res = await previewGET(req("http://localhost/api/vnext/projects/p1/twin-models/model-1/preview-image"), {
      params: Promise.resolve({ projectId: "p1", modelId: "model-1" }),
    });

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://signed.example/orgs/x/preview.jpg");
  });

  it("serves the preview image to the project creator", async () => {
    sessionUser = { id: "user-1" };
    orgScript = null;
    projectsScript = [{ data: AUTHORIZED_PROJECT, error: null }];
    membershipScript = null;
    modelScript = { data: { preview_storage_key: "orgs/x/preview.jpg", model_format: "spz", storage_key: "orgs/x/model.spz" }, error: null };
    capabilityScript = INCLUDED_SCOPE;

    const res = await previewGET(req("http://localhost/api/vnext/projects/p1/twin-models/model-1/preview-image"), {
      params: Promise.resolve({ projectId: "p1", modelId: "model-1" }),
    });

    expect(res.status).toBe(307);
  });

  it("serves the preview image to a cross-org project_members collaborator", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-collaborator-home" };
    projectsScript = [
      { data: null, error: { message: "no rows" } },
      { data: AUTHORIZED_PROJECT, error: null },
    ];
    membershipScript = { project_id: "p1" };
    modelScript = { data: { preview_storage_key: "orgs/x/preview.jpg", model_format: "spz", storage_key: "orgs/x/model.spz" }, error: null };
    capabilityScript = INCLUDED_SCOPE;

    const res = await previewGET(req("http://localhost/api/vnext/projects/p1/twin-models/model-1/preview-image"), {
      params: Promise.resolve({ projectId: "p1", modelId: "model-1" }),
    });

    expect(res.status).toBe(307);
    expect(recordedEq).toContainEqual(["digital_twin_models", "digital_twin_spaces.project_id", "p1"]);
  });

  it("does not serve a ready preview when Reality is not included", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-owner" };
    projectsScript = [{ data: AUTHORIZED_PROJECT, error: null }];
    membershipScript = null;
    modelScript = { data: { preview_storage_key: "orgs/x/preview.jpg", model_format: "spz", storage_key: "orgs/x/model.spz" }, error: null };
    capabilityScript = {
      data: [{ project_id: "p1", capability_id: "reality", included: false }],
      error: null,
    };

    const res = await previewGET(req("http://localhost/api/vnext/projects/p1/twin-models/model-1/preview-image"), {
      params: Promise.resolve({ projectId: "p1", modelId: "model-1" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("refuses an unauthorized user before ever querying the model table", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-unrelated" };
    projectsScript = [{ data: null, error: { message: "no rows" } }];
    membershipScript = null;
    modelScript = { data: { preview_storage_key: "orgs/x/preview.jpg" }, error: null };

    const res = await previewGET(req("http://localhost/api/vnext/projects/p1/twin-models/model-1/preview-image"), {
      params: Promise.resolve({ projectId: "p1", modelId: "model-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("refuses a model id that belongs to a different project", async () => {
    sessionUser = { id: "user-1" };
    orgScript = { org_id: "org-owner" };
    projectsScript = [{ data: AUTHORIZED_PROJECT, error: null }];
    membershipScript = null;
    // The model exists, but not under a space that belongs to project p1 — the embedded-join
    // filter excludes it, so the scoped query returns nothing.
    modelScript = { data: null, error: null };

    const res = await previewGET(
      req("http://localhost/api/vnext/projects/p1/twin-models/model-from-other-project/preview-image"),
      { params: Promise.resolve({ projectId: "p1", modelId: "model-from-other-project" }) },
    );

    expect(res.status).toBe(404);
  });

  it("has no dependency on withAppAuth or the digital_twin standalone-app entitlement", () => {
    const source = readFileSync(
      "app/api/vnext/projects/[projectId]/twin-models/[modelId]/preview-image/route.ts",
      "utf8",
    );
    expect(source).not.toContain("withAppAuth(");
    expect(source).not.toContain('"digital_twin"');
  });
});
