import { describe, expect, it } from "vitest";
import type { VnextVisit } from "@/lib/vnext/history/history-types";
import {
  applyScopeToEvidence,
  canClientSeeRepresentation,
  compareRepAllowed,
  filterVisitsForScope,
  projectNavForScope,
} from "./filter-client-surface";
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
  it("lets an org manager replace scope and stores every capability", async () => {
    const inserted: unknown[] = [];
    const admin = writer({ orgRole: "owner", memberRole: "viewer" }, inserted);
    const result = await replaceProjectClientScope(admin, "user-1", "p1", "org-a", ["reality", "drone", "plans"]);
    expect(result).toBe("ok");
    expect(inserted).toHaveLength(9);
    expect(inserted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ capability_id: "reality", included: true }),
        expect.objectContaining({ capability_id: "thermal", included: false }),
        expect.objectContaining({ capability_id: "plans", included: true }),
      ]),
    );
    expect(JSON.stringify(inserted)).not.toContain("drone");
  });

  it("refuses a collaborator and an unrelated writer", async () => {
    const inserted: unknown[] = [];
    const collaborator = await replaceProjectClientScope(
      writer({ orgRole: null, memberRole: "collaborator" }, inserted),
      "user-1",
      "p1",
      "org-a",
      ["thermal"],
    );
    const viewer = await replaceProjectClientScope(
      writer({ orgRole: null, memberRole: "viewer" }, inserted),
      "user-2",
      "p1",
      "org-a",
      ["thermal"],
    );
    expect(collaborator).toBe("denied");
    expect(viewer).toBe("denied");
    expect(inserted).toEqual([]);
  });
});

function writer(
  roles: { orgRole: string | null; memberRole: string | null },
  inserted: unknown[],
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
        delete: () => ({ eq: async () => ({ error: null }) }),
        insert: async (rows: unknown[]) => {
          inserted.push(...rows);
          return { error: null };
        },
      };
      return node;
    },
  };
}
