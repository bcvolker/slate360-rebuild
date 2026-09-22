import { describe, expect, it } from "vitest";
import type { VnextVisit } from "@/lib/vnext/history/history-types";
import {
  applyScopeToEvidence,
  canClientSeeRepresentation,
  compareRepAllowed,
  filterVisitsForScope,
  projectNavForScope,
} from "./filter-client-surface";
import { CLIENT_CAPABILITY_IDS } from "./capabilities";
import { resolveClientProjectScope, scopeFromIncluded, unconfiguredClientScope } from "./resolve-client-scope";
import { replaceProjectClientScope } from "./write-project-scope";
import type { PortfolioEvidence } from "@/lib/vnext/portfolio-types";

function visit(partial: Partial<VnextVisit> & Pick<VnextVisit, "id" | "kind">): VnextVisit {
  return {
    occurredAt: "2026-09-18T12:00:00.000Z",
    dateLabel: "Sep 18, 2026",
    title: partial.id,
    kindLabel: partial.kind,
    sources: [],
    plans: [],
    items: [],
    itemCount: 0,
    thumbnailHref: null,
    frame: null,
    ...partial,
  };
}

const evidence = (): PortfolioEvidence => ({
  realityPreviewUrl: "/reality.jpg",
  pano360Url: "/pano.jpg",
  droneUrl: "/drone.jpg",
  planUrl: "/plan.jpg",
  timestamps: [],
  representations: ["reality", "geometry", "360", "plan", "thermal", "drone"],
});

describe("project client scope", () => {
  it("keeps portal sections and hides services when nothing is configured", () => {
    const scope = unconfiguredClientScope();
    expect(scope.configured).toBe(false);
    expect(scope.included.has("history")).toBe(true);
    expect(scope.included.has("thermal")).toBe(false);
    expect(scope.included.has("reality")).toBe(false);
  });

  it("treats unknown ids as missing config", () => {
    const scope = resolveClientProjectScope([{ capabilityId: "drone", included: true }]);
    expect(scope.configured).toBe(false);
    expect(canClientSeeRepresentation(scope, "drone")).toBe(false);
  });

  it("uses explicit rows and does not fill missing services", () => {
    const scope = resolveClientProjectScope([
      { capabilityId: "reality", included: true },
      { capabilityId: "thermal", included: false },
    ]);
    expect(scope.configured).toBe(true);
    expect(scope.included.has("reality")).toBe(true);
    expect(scope.included.has("thermal")).toBe(false);
    expect(scope.included.has("history")).toBe(false);
  });

  it("removes a ready reality model and a thermal share from client evidence when those services are off", () => {
    const scope = scopeFromIncluded(["pano360", "plans", "items", "documents", "history", "compare"]);
    const next = applyScopeToEvidence(evidence(), scope);
    expect(next.representations).toEqual(["360", "plan"]);
    expect(next.realityPreviewUrl).toBeNull();
    expect(next.pano360Url).toBe("/pano.jpg");
    expect(next.droneUrl).toBeNull();
  });

  it("drops thermal history, reality compare, and plan context when those capabilities are off", () => {
    const scope = scopeFromIncluded(["history", "pano360", "compare"]);
    const visits = filterVisitsForScope(
      [
        visit({
          id: "thermal-1",
          kind: "thermal",
          sources: [{ rep: "thermal", label: "Ceiling", sourceId: "t", exploreHref: "/t", imageHref: null }],
        }),
        visit({
          id: "reality-1",
          kind: "reality",
          sources: [{ rep: "reality", label: "Scan", sourceId: "m", exploreHref: "/m", imageHref: "/m.jpg" }],
        }),
        visit({
          id: "site-1",
          kind: "site",
          sources: [{ rep: "360", label: "Hall", sourceId: "p", exploreHref: "/p", imageHref: "/p.jpg" }],
          plans: [{ sheetId: "s", sheetLabel: "A1", revisionLabel: null, exploreHref: "/plan", imageHref: "/plan.jpg" }],
        }),
      ],
      scope,
    );
    expect(visits.map((row) => row.id)).toEqual(["site-1"]);
    expect(visits[0].sources.map((source) => source.rep)).toEqual(["360"]);
    expect(visits[0].plans).toEqual([]);
    expect(compareRepAllowed(scope, "reality")).toBe(false);
    expect(compareRepAllowed(scope, "360")).toBe(true);
  });

  it("hides History and Explore when the project has no included representations", () => {
    const scope = scopeFromIncluded(["items"]);
    const nav = projectNavForScope("p1", scope, ["reality", "thermal"]);
    expect(nav.map((item) => item.label)).toEqual(["Overview", "Items"]);
  });
});

describe("project scope writes", () => {
  it("replaces every capability in one call and ignores unknown ids", async () => {
    const state = scopeState();
    const admin = writer({ orgRole: "owner", memberRole: "viewer" }, state);
    const result = await replaceProjectClientScope(admin, "user-1", "p1", "org-a", ["reality", "drone", "plans"]);
    expect(result).toBe("ok");
    expect(state.calls).toEqual([
      {
        name: "replace_project_client_scope",
        args: { p_project_id: "p1", p_included: ["reality", "plans"], p_actor: "user-1" },
      },
    ]);
    expect(state.stored).toHaveLength(9);
    expect(state.stored.find((row) => row.capability_id === "reality")?.included).toBe(true);
    expect(state.stored.find((row) => row.capability_id === "plans")?.included).toBe(true);
    expect(state.stored.find((row) => row.capability_id === "thermal")?.included).toBe(false);
    expect(state.stored.map((row) => row.capability_id)).toEqual([...CLIENT_CAPABILITY_IDS]);
  });

  it("turns an included service off and an excluded service on without dropping rows", async () => {
    const state = scopeState();
    const admin = writer({ orgRole: "manager", memberRole: null }, state);
    await replaceProjectClientScope(admin, "user-1", "p1", "org-a", ["reality", "thermal"]);
    await replaceProjectClientScope(admin, "user-1", "p1", "org-a", ["thermal"]);
    expect(state.stored).toHaveLength(9);
    expect(state.stored.find((row) => row.capability_id === "reality")?.included).toBe(false);
    expect(state.stored.find((row) => row.capability_id === "thermal")?.included).toBe(true);
    expect(state.deletes).toBe(0);
  });

  it("leaves the stored set unchanged when the database function fails", async () => {
    const state = scopeState();
    state.stored = CLIENT_CAPABILITY_IDS.map((capability_id) => ({ capability_id, included: capability_id === "reality" }));
    state.rpcError = { message: "write failed" };
    const before = state.stored.map((row) => ({ ...row }));
    const admin = writer({ orgRole: "owner", memberRole: null }, state);
    const result = await replaceProjectClientScope(admin, "user-1", "p1", "org-a", ["thermal"]);
    expect(result).toBe("error");
    expect(state.stored).toEqual(before);
    expect(state.deletes).toBe(0);
  });

  it("refuses a collaborator and a viewer before any write", async () => {
    const state = scopeState();
    const collaborator = await replaceProjectClientScope(
      writer({ orgRole: null, memberRole: "collaborator" }, state),
      "user-1",
      "p1",
      "org-a",
      ["thermal"],
    );
    const viewer = await replaceProjectClientScope(
      writer({ orgRole: null, memberRole: "viewer" }, state),
      "user-2",
      "p1",
      "org-a",
      ["thermal"],
    );
    expect(collaborator).toBe("denied");
    expect(viewer).toBe("denied");
    expect(state.calls).toEqual([]);
    expect(state.stored).toEqual([]);
  });
});

type StoredCapability = { capability_id: string; included: boolean };

function scopeState() {
  return {
    stored: [] as StoredCapability[],
    calls: [] as Array<{ name: string; args: { p_project_id: string; p_included: string[]; p_actor: string } }>,
    deletes: 0,
    rpcError: null as { message: string; code?: string } | null,
  };
}

function writer(
  roles: { orgRole: string | null; memberRole: string | null },
  state: ReturnType<typeof scopeState>,
) {
  return {
    from(table: string) {
      const data =
        table === "organization_members"
          ? roles.orgRole
            ? { role: roles.orgRole }
            : null
          : roles.memberRole
            ? { role: roles.memberRole }
            : null;
      const node = {
        select: () => node,
        eq: () => node,
        maybeSingle: async () => ({ data, error: null }),
        delete: () => {
          state.deletes += 1;
          return { eq: async () => ({ error: null }) };
        },
      };
      return node;
    },
    async rpc(
      name: string,
      args: { p_project_id: string; p_included: string[]; p_actor: string },
    ) {
      state.calls.push({ name, args });
      if (state.rpcError) return { error: state.rpcError };
      const included = new Set(args.p_included);
      state.stored = CLIENT_CAPABILITY_IDS.map((capability_id) => ({
        capability_id,
        included: included.has(capability_id),
      }));
      return { error: null };
    },
  };
}
