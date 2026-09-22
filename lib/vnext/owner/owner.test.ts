import { describe, expect, it } from "vitest";
import { buildOwnerAttention } from "./attention";
import { clientGroupKey, groupOwnerClients } from "./clients";
import { PREVIEW_OWNER_FACTS, PREVIEW_OWNER_FAILURES, previewOwnerWorkspace } from "./preview-owner";
import { filterOwnerProjects, serviceLinesFor } from "./project-summary";
import type { OwnerProjectFact } from "./owner-types";

describe("owner attention", () => {
  it("creates a row only for an explicit failed job on a project in this workspace", () => {
    const items = buildOwnerAttention(PREVIEW_OWNER_FACTS, PREVIEW_OWNER_FAILURES);
    expect(items.map((item) => item.id)).toEqual(["capture-cap-smith"]);
    expect(items[0]?.title).toBe("Room 213 failed");
    expect(items[0]?.destinationHref).toBe("/vnext/projects/smith");
    expect(items.some((item) => item.projectId === "other")).toBe(false);
  });

  it("does not treat an omitted service or an unreviewed capture as attention", () => {
    const pending: OwnerProjectFact = {
      ...PREVIEW_OWNER_FACTS[0]!,
      id: "quiet",
      included: ["items", "documents", "history", "compare"],
    };
    const items = buildOwnerAttention(
      [pending],
      [{ id: "old", projectId: "quiet", kind: "capture", title: "Draft", occurredAt: "2026-01-01T00:00:00.000Z" }],
    );
    expect(items).toHaveLength(1);
    expect(serviceLinesFor(pending).map((line) => line.label)).toEqual([]);
    expect(items[0]?.title).not.toMatch(/Thermal|missing/i);
  });

  it("drops a failure that belongs to another workspace", () => {
    const items = buildOwnerAttention(PREVIEW_OWNER_FACTS, [
      { id: "x", projectId: "not-in-list", kind: "plan", title: "A1", occurredAt: "2026-09-01T00:00:00.000Z" },
    ]);
    expect(items).toEqual([]);
  });
});

describe("owner clients", () => {
  it("groups exact names after space and case folding, and keeps legal suffixes apart", () => {
    expect(clientGroupKey("  UCL  ")).toBe(clientGroupKey("ucl"));
    expect(clientGroupKey("ABC Construction")).not.toBe(clientGroupKey("ABC Construction LLC"));
    const clients = groupOwnerClients(PREVIEW_OWNER_FACTS);
    const ucl = clients.find((client) => client.key === "ucl");
    expect(ucl?.projectCount).toBe(2);
    expect(ucl?.name).toBe("UCL");
    const workspace = previewOwnerWorkspace();
    expect(workspace.projects.find((project) => project.id === "library")?.clientName).toBe("UCL");
    expect(clients.filter((client) => client.key.startsWith("abc construction"))).toHaveLength(2);
  });
});

describe("owner projects", () => {
  it("shows included services and hides a service that was not included", () => {
    const workspace = previewOwnerWorkspace();
    const payne = workspace.projects.find((project) => project.id === "payne");
    const harbor = workspace.projects.find((project) => project.id === "harbor");
    expect(payne?.includedLabel).toBe("Reality · 360 · Plans");
    expect(payne?.visibleLabel).toBe("Reality · Plans");
    expect(payne?.serviceLines.map((line) => line.id)).not.toContain("thermal");
    expect(harbor?.includedLabel).toBe("");
    expect(harbor?.serviceLines).toEqual([]);
    const north = workspace.projects.find((project) => project.id === "north");
    expect(north?.serviceLines.find((line) => line.id === "thermal")).toMatchObject({
      internal: true,
      clientVisible: false,
    });
  });

  it("filters by search, client, and attention without inventing a match", () => {
    const workspace = previewOwnerWorkspace();
    expect(filterOwnerProjects(workspace.projects, { q: "oakland" }).map((project) => project.id)).toEqual(["smith"]);
    expect(filterOwnerProjects(workspace.projects, { client: "Harbor Co" }).map((project) => project.id)).toEqual(["harbor"]);
    expect(filterOwnerProjects(workspace.projects, { attentionOnly: true }).map((project) => project.id)).toEqual(["smith"]);
  });
});
