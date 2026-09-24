import { describe, expect, it, vi } from "vitest";
import { replaceProjectClientScope } from "@/lib/vnext/scope/write-project-scope";

describe("owner scope write", () => {
  it("lets the operations owner write", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const result = await replaceProjectClientScope({ rpc }, "owner", "project-1", ["reality", "thermal"], true);
    expect(result).toBe("ok");
    expect(rpc).toHaveBeenCalledWith("replace_project_client_scope", {
      p_project_id: "project-1",
      p_included: ["reality", "thermal"],
      p_actor: "owner",
    });
  });

  it("rejects an ordinary org member, a project manager, and a client member without writing", async () => {
    const rpc = vi.fn();
    for (const userId of ["org-member", "project-manager", "client-member"]) {
      const result = await replaceProjectClientScope({ rpc }, userId, "project", ["reality"], false);
      expect(result).toBe("denied");
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("drops an unknown capability before saving", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const result = await replaceProjectClientScope(
      { rpc },
      "owner",
      "project-1",
      ["reality", "upgrade", "thermal"],
      true,
    );
    expect(result).toBe("ok");
    expect(rpc).toHaveBeenCalledWith("replace_project_client_scope", {
      p_project_id: "project-1",
      p_included: ["reality", "thermal"],
      p_actor: "owner",
    });
  });
});
