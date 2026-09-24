import { describe, expect, it } from "vitest";
import {
  CLIENT_ACCOUNT,
  CLIENT_HOME,
  OWNER_ACCOUNT,
  OWNER_HOME,
  POST_AUTH_RESOLVER,
  postAuthDestination,
  resolvePhase1Cutover,
  safeInternalPath,
} from "@/lib/vnext/cutover";

const ID = "11111111-1111-4111-8111-111111111111";

function go(overrides: Partial<Parameters<typeof resolvePhase1Cutover>[0]> = {}) {
  return resolvePhase1Cutover({
    pathname: "/",
    search: "",
    redirectTo: null,
    hasUser: true,
    canAccessOperationsConsole: false,
    isMobile: false,
    isStandaloneOnly: false,
    ...overrides,
  });
}

describe("phase 1 cutover", () => {
  it("sends a desktop owner from login to the operations home", () => {
    expect(go({ pathname: "/login", canAccessOperationsConsole: true })?.pathname).toBe(OWNER_HOME);
  });

  it("sends a desktop client from login to the portfolio", () => {
    expect(go({ pathname: "/login" })?.pathname).toBe(CLIENT_HOME);
  });

  it("sends mobile login without a capture deep link to the persona home", () => {
    expect(go({ pathname: "/login", isMobile: true })?.pathname).toBe(CLIENT_HOME);
    expect(go({ pathname: "/login", isMobile: true, canAccessOperationsConsole: true })?.pathname).toBe(OWNER_HOME);
  });

  it("keeps an explicit deep link ahead of the default home", () => {
    const deep = `/vnext/projects/${ID}/explore?rep=plan&source=sheet-9`;
    expect(go({ pathname: "/login", redirectTo: deep })).toEqual({
      pathname: `/vnext/projects/${ID}/explore`,
      search: "?rep=plan&source=sheet-9",
    });
  });

  it("rejects an external redirectTo", () => {
    expect(safeInternalPath("https://evil.example/steal")).toBeNull();
    expect(go({ pathname: "/login", redirectTo: "https://evil.example" })?.pathname).toBe(CLIENT_HOME);
  });

  it("rejects control-character and protocol-relative open-redirect payloads", () => {
    for (const payload of [
      "/\t/evil.com",
      "/\n/evil.com",
      "/\r//evil.com",
      "//evil.com",
      "\\evil.com",
      "https://evil.com",
    ]) {
      expect(safeInternalPath(payload)).toBeNull();
    }
  });

  it("splits /dashboard by persona and does not loop through /app", () => {
    expect(go({ pathname: "/dashboard" })?.pathname).toBe(CLIENT_HOME);
    expect(go({ pathname: "/dashboard", canAccessOperationsConsole: true })?.pathname).toBe(OWNER_HOME);
    expect(go({ pathname: "/dashboard", isMobile: true })?.pathname).toBe(CLIENT_HOME);
    expect(go({ pathname: "/app", isMobile: true })).toBeNull();
    expect(go({ pathname: "/app", isMobile: false })).toBeNull();
  });

  it("keeps standalone-only dashboard users on the field shell", () => {
    expect(go({ pathname: "/dashboard", isStandaloneOnly: true })?.pathname).toBe("/app");
    expect(go({ pathname: "/app", isStandaloneOnly: true })).toBeNull();
  });

  it("redirects approved project tabs and preserves the project id", () => {
    expect(go({ pathname: "/projects", hasUser: false })?.pathname).toBe(CLIENT_HOME);
    expect(go({ pathname: `/projects/${ID}`, hasUser: false })?.pathname).toBe(`${CLIENT_HOME}/${ID}`);
    expect(go({ pathname: `/projects/${ID}/slatedrop` })?.pathname).toBe(`${CLIENT_HOME}/${ID}/documents`);
    expect(go({ pathname: `/projects/${ID}/twins/model-7` })).toEqual({
      pathname: `${CLIENT_HOME}/${ID}/explore`,
      search: "?source=model-7&rep=reality",
    });
    expect(go({ pathname: `/projects/${ID}/walks/session-2` })?.pathname).toBe(
      `${CLIENT_HOME}/${ID}/history/session-2`,
    );
    expect(go({ pathname: `/projects/${ID}/punch-list` })?.pathname).toBe(`${CLIENT_HOME}/${ID}/items`);
    expect(go({ pathname: `/projects/${ID}/plans`, search: "?sheet=sheet-9" })).toEqual({
      pathname: `${CLIENT_HOME}/${ID}/explore`,
      search: "?source=sheet-9&rep=plan",
    });
    expect(go({ pathname: `/projects/${ID}/plans` })?.pathname).toBe(`${CLIENT_HOME}/${ID}/documents`);
  });

  it("keeps operational /projects* routes reachable for internal/field users instead of rewriting to the vNext client home", () => {
    expect(go({ pathname: `/projects/${ID}`, isInternalUser: true })).toBeNull();
    expect(go({ pathname: `/projects/${ID}/twins/model-7`, isInternalUser: true })).toBeNull();
    expect(go({ pathname: `/projects/${ID}/plans`, search: "?sheet=sheet-9", isInternalUser: true })).toBeNull();
    expect(go({ pathname: "/projects", isInternalUser: true })).toBeNull();
    // A client (the default) is unaffected — still redirected to the vNext home.
    expect(go({ pathname: `/projects/${ID}` })?.pathname).toBe(`${CLIENT_HOME}/${ID}`);
  });

  it("keeps a deep-link redirectTo for an internal user pointed at the operational route, not the vNext client rewrite", () => {
    const deep = `/projects/${ID}/twins/model-7`;
    expect(go({ pathname: "/login", redirectTo: deep, isInternalUser: true })).toEqual({
      pathname: deep,
      search: "",
    });
  });

  it("leaves operational and specialized routes alone", () => {
    for (const pathname of [
      "/projects/new",
      `/projects/${ID}/deliverables`,
      `/projects/${ID}/team`,
      `/projects/${ID}/people`,
      `/projects/${ID}/photos`,
      "/site-walk/capture-v2",
      "/app",
      "/share/project/token",
      "/share/twin/token",
      "/share/thermal/token",
      "/share/deliverable/token",
      "/view/token",
      "/portal/token",
      "/operations-console/feedback",
      "/preview/vnext/client",
    ]) {
      expect(go({ pathname, hasUser: false })).toBeNull();
    }
  });

  it("sends the owner console home to /vnext/ops and keeps account persona split", () => {
    expect(go({ pathname: "/operations-console", hasUser: false })?.pathname).toBe(OWNER_HOME);
    expect(go({ pathname: "/ceo", hasUser: false })?.pathname).toBe(OWNER_HOME);
    expect(go({ pathname: "/my-account" })?.pathname).toBe(CLIENT_ACCOUNT);
    expect(go({ pathname: "/my-account", canAccessOperationsConsole: true })?.pathname).toBe(OWNER_ACCOUNT);
    expect(go({ pathname: "/my-account", isMobile: true })).toBeNull();
  });

  it("does not use a billing path as the post-auth home", () => {
    expect(postAuthDestination(null)).toBe(POST_AUTH_RESOLVER);
    expect(postAuthDestination("/plans?plan=pro")).toBe(POST_AUTH_RESOLVER);
    expect(postAuthDestination(`/vnext/projects/${ID}/history`)).toBe(`${CLIENT_HOME}/${ID}/history`);
    expect(postAuthDestination("/site-walk/capture-v2")).toBe("/site-walk/capture-v2");
  });
});
