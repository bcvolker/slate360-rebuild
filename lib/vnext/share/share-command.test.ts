import { beforeEach, describe, expect, it, vi } from "vitest";
import { scopeFromIncluded } from "@/lib/vnext/scope/resolve-client-scope";

vi.mock("./share-store", () => ({
  readSavedView: vi.fn(),
  insertShareLink: vi.fn(),
  revokeShareLink: vi.fn(),
}));

vi.mock("@/lib/vnext/scope/read-project-scope", () => ({
  readClientScope: vi.fn(),
}));

vi.mock("@/lib/vnext/release/source-visible", () => ({
  clientMayReadSource: vi.fn(),
}));

import { createShareLink, rejectUnlessOwner, revokeOwnedShare } from "./share-command";
import { insertShareLink, readSavedView, revokeShareLink } from "./share-store";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import { clientMayReadSource } from "@/lib/vnext/release/source-visible";

const view = {
  id: "view-1",
  projectId: "project-a",
  title: "Above-ceiling plumbing",
  representation: "reality" as const,
  sourceId: "model-a",
  visitId: null,
  occurredAt: "2026-09-18T15:00:00.000Z",
  itemId: null,
  planSheetId: null,
  viewState: null,
  aspect: null,
  createdAt: "2026-09-18T16:00:00.000Z",
};

const input = {
  actorId: "user-1",
  allowedProjectIds: ["project-a"],
  target: "saved_view",
  projectId: "project-a",
  savedViewId: "view-1",
  label: "Plumbing",
  expiresOn: "2026-10-01",
  now: new Date("2026-09-22T12:00:00.000Z"),
};

describe("vNext share commands", () => {
  beforeEach(() => {
    const saved = vi.mocked(readSavedView);
    const insert = vi.mocked(insertShareLink);
    const revoke = vi.mocked(revokeShareLink);
    const scope = vi.mocked(readClientScope);
    const published = vi.mocked(clientMayReadSource);
    saved.mockReset();
    insert.mockReset();
    revoke.mockReset();
    scope.mockReset();
    published.mockReset();
    saved.mockResolvedValue(view);
    scope.mockResolvedValue(scopeFromIncluded(["reality", "history"]));
    published.mockResolvedValue(true);
    insert.mockImplementation(async (_admin: unknown, row: { token: string }) => ({
      id: "link-1",
      token: row.token,
      projectId: "project-a",
      targetType: "saved_view",
      savedViewId: "view-1",
      label: "Plumbing",
      expiresAt: "2026-10-01T23:59:59.999Z",
      isRevoked: false,
      viewCount: 0,
      createdAt: "2026-09-22T12:00:00.000Z",
    }));
    revoke.mockResolvedValue(true);
  });

  it("does not let a non-owner create a public link", () => {
    expect(rejectUnlessOwner(false)).toMatchObject({ status: 404 });
    expect(rejectUnlessOwner(true)).toBeNull();
  });

  it("creates a project link and a saved-view link without a password", async () => {
    const project = await createShareLink({} as never, { ...input, target: "project", savedViewId: null });
    expect(project.ok).toBe(true);
    const saved = await createShareLink({} as never, input);
    expect(saved.ok).toBe(true);
    if (saved.ok) expect(saved.url).toContain("/share/project/");
    const inserted = vi.mocked(insertShareLink).mock.calls[1]?.[1] as Record<string, unknown>;
    expect(inserted.targetType).toBe("saved_view");
    expect(inserted.password).toBeUndefined();
    expect(inserted.password_hash).toBeUndefined();
    expect(vi.mocked(readSavedView)).toHaveBeenCalled();
  });

  it("rejects a cross-project, unpublished, or out-of-scope saved view", async () => {
    vi.mocked(readSavedView).mockResolvedValue({ ...view, projectId: "project-b" });
    expect(await createShareLink({} as never, input)).toMatchObject({ status: 404 });
    vi.mocked(readSavedView).mockResolvedValue(view);
    vi.mocked(clientMayReadSource).mockResolvedValue(false);
    expect(await createShareLink({} as never, input)).toMatchObject({ status: 409 });
    vi.mocked(clientMayReadSource).mockResolvedValue(true);
    vi.mocked(readClientScope).mockResolvedValue(scopeFromIncluded(["history"]));
    expect(await createShareLink({} as never, input)).toMatchObject({ status: 409 });
    vi.mocked(readSavedView).mockResolvedValue({ ...view, representation: "thermal" as const });
    vi.mocked(readClientScope).mockResolvedValue(scopeFromIncluded(["thermal"]));
    expect(await createShareLink({} as never, input)).toMatchObject({ status: 409 });
    expect(vi.mocked(insertShareLink)).not.toHaveBeenCalled();
  });

  it("rejects a malformed target and does not delete the saved view when revoking", async () => {
    expect(await createShareLink({} as never, { ...input, target: "role" })).toMatchObject({ status: 400 });
    expect(await revokeOwnedShare({} as never, "link-1", ["project-a"])).toMatchObject({ ok: true });
    expect(vi.mocked(revokeShareLink)).toHaveBeenCalledWith(expect.anything(), "link-1", ["project-a"]);
    expect(vi.mocked(readSavedView)).not.toHaveBeenCalled();
  });
});
