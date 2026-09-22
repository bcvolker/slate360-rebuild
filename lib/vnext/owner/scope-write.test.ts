import { describe, expect, it, vi } from "vitest";

const manage = vi.hoisted(() => vi.fn());

vi.mock("@/lib/vnext/plans/manage-access", () => ({
  userCanManageVnextProject: (...args: unknown[]) => manage(...args),
}));

import { replaceProjectClientScope } from "@/lib/vnext/scope/write-project-scope";

describe("owner scope write", () => {
  it("rejects a user who cannot manage the project and does not write", async () => {
    manage.mockResolvedValue(false);
    const rpc = vi.fn();
    const result = await replaceProjectClientScope({ rpc }, "user", "project", "org", ["reality", "thermal"]);
    expect(result).toBe("denied");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("drops an unknown capability before saving", async () => {
    manage.mockResolvedValue(true);
    const rpc = vi.fn(async () => ({ error: null }));
    const result = await replaceProjectClientScope({ rpc }, "user", "project-1", "org-1", ["reality", "upgrade", "thermal"]);
    expect(result).toBe("ok");
    expect(rpc).toHaveBeenCalledWith("replace_project_client_scope", {
      p_project_id: "project-1",
      p_included: ["reality", "thermal"],
      p_actor: "user",
    });
  });
});
