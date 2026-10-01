import { describe, expect, it, vi } from "vitest";

/**
 * getScopedProjectForUser (lib/projects/access.ts) is the vNext project-access contract (org OR
 * creator OR project_members) that every vNext-scoped Explore media route now depends on directly
 * via withProjectAuth. It had no test coverage before this Slice 4 correction — these are the
 * load-bearing cases: same-org member, creator, and — the one the media-access bug actually broke —
 * a project_members collaborator whose org membership doesn't match the project's org at all.
 * Placed under lib/vnext/ (not lib/projects/) so `npm run test:vnext`'s `vitest run lib/vnext`
 * actually exercises it, matching every other Slice 4 test's location.
 */
type ScriptedResult = { data: unknown; error: unknown };

let script: {
  org: { org_id: string } | null;
  projectsCalls: ScriptedResult[];
  membership: { project_id: string } | null;
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    let projectsCallIndex = 0;
    const chain = (result: ScriptedResult) => {
      const node = {
        select: () => node,
        eq: () => node,
        or: () => node,
        limit: () => node,
        single: async () => result,
        maybeSingle: async () => result,
      };
      return node;
    };
    return {
      from(table: string) {
        if (table === "organization_members") return chain({ data: script.org, error: null });
        if (table === "project_members") return chain({ data: script.membership, error: null });
        if (table === "projects") {
          const result = script.projectsCalls[Math.min(projectsCallIndex, script.projectsCalls.length - 1)];
          projectsCallIndex += 1;
          return chain(result);
        }
        throw new Error(`unexpected table ${table}`);
      },
    };
  },
}));

const { getScopedProjectForUser } = await import("@/lib/projects/access");

const PROJECT_ROW = { id: "p1", name: "Harbor Street", org_id: "org-a" };
const OTHER_OWNER_PROJECT_ROW = { id: "p1", name: "Harbor Street", org_id: "org-other-owner" };
const NOT_FOUND: ScriptedResult = { data: null, error: { message: "no rows" } };

describe("getScopedProjectForUser — vNext project-access contract", () => {
  it("allows a same-org project user", async () => {
    script = { org: { org_id: "org-a" }, projectsCalls: [{ data: PROJECT_ROW, error: null }], membership: null };
    const { project } = await getScopedProjectForUser("user-1", "p1", "id, name, org_id");
    expect(project).toEqual(PROJECT_ROW);
  });

  it("allows the project creator even with no matching org", async () => {
    script = { org: null, projectsCalls: [{ data: PROJECT_ROW, error: null }], membership: null };
    const { project } = await getScopedProjectForUser("user-1", "p1", "id, name, org_id");
    expect(project).toEqual(PROJECT_ROW);
  });

  it("allows a project_members collaborator whose org membership does NOT match the project's org — the exact case the media-access bug broke", async () => {
    script = {
      org: { org_id: "org-collaborator-home" },
      projectsCalls: [NOT_FOUND, { data: OTHER_OWNER_PROJECT_ROW, error: null }],
      membership: { project_id: "p1" },
    };
    const { project } = await getScopedProjectForUser("user-1", "p1", "id, name, org_id");
    expect(project).toEqual(OTHER_OWNER_PROJECT_ROW);
  });

  it("refuses an unauthorized user (no org match, not creator, no project_members row)", async () => {
    script = { org: { org_id: "org-unrelated" }, projectsCalls: [NOT_FOUND], membership: null };
    const { project } = await getScopedProjectForUser("user-1", "p1", "id, name, org_id");
    expect(project).toBeNull();
  });
});
