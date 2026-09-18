import { describe, expect, it } from "vitest";
import { decideVnextAccess } from "./access";
import {
  decideVnextProjectRecordAccess,
  filterToAccessibleProjectIds,
  isVnextProjectId,
} from "./portfolio-access";

describe("client project record access", () => {
  it("allows a scoped project and rejects a missing one", () => {
    expect(decideVnextProjectRecordAccess({ id: "11111111-1111-4111-8111-111111111111" })).toBe(
      "allow",
    );
    expect(decideVnextProjectRecordAccess(null)).toBe("not-found");
  });

  it("cannot surface ids outside the existing access list", () => {
    const visible = filterToAccessibleProjectIds(
      [{ id: "a" }, { id: "secret" }],
      ["a"],
    );
    expect(visible.map((row) => row.id)).toEqual(["a"]);
  });

  it("validates project ids before lookup", () => {
    expect(isVnextProjectId("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isVnextProjectId("../ops")).toBe(false);
    expect(isVnextProjectId("not-a-uuid")).toBe(false);
  });
});

describe("project deep-link session gate", () => {
  const path = "/vnext/projects/11111111-1111-4111-8111-111111111111";

  it("preserves the exact project path on login", () => {
    const decision = decideVnextAccess({
      kind: "client",
      redirectTo: path,
      user: null,
      isBetaApproved: false,
      canAccessOperationsConsole: false,
    });
    expect(decision.outcome).toBe("login");
    if (decision.outcome !== "login") return;
    expect(new URL(decision.loginPath, "https://www.slate360.ai").searchParams.get("redirectTo")).toBe(
      path,
    );
  });

  it("allows a beta-approved org user onto the project scaffold", () => {
    expect(
      decideVnextAccess({
        kind: "client",
        redirectTo: path,
        user: { id: "user-ordinary" },
        isBetaApproved: true,
        canAccessOperationsConsole: false,
      }),
    ).toEqual({ outcome: "allow" });
  });

  it("does not grant owner routes to an ordinary member", () => {
    expect(
      decideVnextAccess({
        kind: "owner",
        redirectTo: "/vnext/ops/projects",
        user: { id: "user-ordinary" },
        isBetaApproved: true,
        canAccessOperationsConsole: false,
      }),
    ).toEqual({ outcome: "not-found" });
  });
});
