import { describe, expect, it } from "vitest";
import {
  decideVnextAccess,
  VNEXT_LOGIN_PATH,
  VNEXT_PENDING_PATH,
  vnextLoginPath,
} from "./access";
import { VNEXT_CLIENT_NAV, VNEXT_OWNER_NAV } from "./nav";

const ordinaryUser = { id: "user-ordinary" };
const ceoUser = { id: "user-ceo" };
const staffUser = { id: "user-staff" };

describe("client vNext access contract", () => {
  for (const item of VNEXT_CLIENT_NAV) {
    it(`allows a beta-approved org user onto ${item.href}`, () => {
      expect(
        decideVnextAccess({
          kind: "client",
          redirectTo: item.href,
          user: ordinaryUser,
          isBetaApproved: true,
          canAccessOperationsConsole: false,
        }),
      ).toEqual({ outcome: "allow" });
    });

    it(`sends unauthenticated users to login with redirectTo=${item.href}`, () => {
      const decision = decideVnextAccess({
        kind: "client",
        redirectTo: item.href,
        user: null,
        isBetaApproved: false,
        canAccessOperationsConsole: false,
      });
      expect(decision).toEqual({
        outcome: "login",
        loginPath: vnextLoginPath(item.href),
      });
      if (decision.outcome !== "login") return;
      const url = new URL(decision.loginPath, "https://www.slate360.ai");
      expect(url.pathname).toBe(VNEXT_LOGIN_PATH);
      expect(url.searchParams.get("redirectTo")).toBe(item.href);
    });

    it(`sends authenticated but unapproved users from ${item.href} to pending-verification`, () => {
      expect(
        decideVnextAccess({
          kind: "client",
          redirectTo: item.href,
          user: ordinaryUser,
          isBetaApproved: false,
          canAccessOperationsConsole: false,
        }),
      ).toEqual({ outcome: "pending-verification" });
    });
  }
});

describe("owner vNext access contract", () => {
  it("does not treat canAccessOperationsConsole as a staff flag", () => {
    expect(
      decideVnextAccess({
        kind: "owner",
        redirectTo: "/vnext/ops",
        user: staffUser,
        isBetaApproved: true,
        canAccessOperationsConsole: false,
      }),
    ).toEqual({ outcome: "not-found" });
  });

  for (const item of VNEXT_OWNER_NAV) {
    it(`allows CEO / operations-console access onto ${item.href}`, () => {
      expect(
        decideVnextAccess({
          kind: "owner",
          redirectTo: item.href,
          user: ceoUser,
          isBetaApproved: true,
          canAccessOperationsConsole: true,
        }),
      ).toEqual({ outcome: "allow" });
    });

    it(`denies an ordinary authenticated member on ${item.href}`, () => {
      expect(
        decideVnextAccess({
          kind: "owner",
          redirectTo: item.href,
          user: ordinaryUser,
          isBetaApproved: true,
          canAccessOperationsConsole: false,
        }),
      ).toEqual({ outcome: "not-found" });
    });

    it(`denies beta-approved staff without operations-console access on ${item.href}`, () => {
      expect(
        decideVnextAccess({
          kind: "owner",
          redirectTo: item.href,
          user: staffUser,
          isBetaApproved: true,
          canAccessOperationsConsole: false,
        }),
      ).toEqual({ outcome: "not-found" });
    });

    it(`preserves unauthenticated redirectTo=${item.href}`, () => {
      const decision = decideVnextAccess({
        kind: "owner",
        redirectTo: item.href,
        user: null,
        isBetaApproved: false,
        canAccessOperationsConsole: false,
      });
      expect(decision.outcome).toBe("login");
      if (decision.outcome !== "login") return;
      const url = new URL(decision.loginPath, "https://www.slate360.ai");
      expect(url.searchParams.get("redirectTo")).toBe(item.href);
    });
  }
});

describe("vNext access helpers", () => {
  it("uses /pending-verification for the unapproved authenticated case", () => {
    expect(VNEXT_PENDING_PATH).toBe("/pending-verification");
  });
});
