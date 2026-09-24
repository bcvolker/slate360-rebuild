import { describe, expect, it } from "vitest";
import {
  VNEXT_ALL_NAV,
  VNEXT_CLIENT_NAV,
  VNEXT_FORBIDDEN_NAV_PREFIXES,
  VNEXT_OWNER_FIELD_TOOLS,
  VNEXT_OWNER_NAV,
  VNEXT_OWNER_PRIMARY_NAV,
  VNEXT_OWNER_SECONDARY_NAV,
  isSafeVnextNavHref,
  isVnextNavActive,
} from "./nav";

describe("vNext navigation contract", () => {
  it("exposes the approved client destinations only", () => {
    expect(VNEXT_CLIENT_NAV.map((item) => item.label)).toEqual(["Projects", "Account"]);
    expect(VNEXT_CLIENT_NAV.map((item) => item.href)).toEqual([
      "/vnext/projects",
      "/vnext/account",
    ]);
  });

  it("exposes the approved owner destinations only", () => {
    expect(VNEXT_OWNER_PRIMARY_NAV.map((item) => item.label)).toEqual([
      "Home",
      "Clients",
      "Projects",
      "Processing",
      "QA & Publish",
      "Shares",
    ]);
    expect(VNEXT_OWNER_SECONDARY_NAV.map((item) => item.label)).toEqual(["Settings", "Account"]);
    expect(VNEXT_OWNER_FIELD_TOOLS.map((item) => item.href)).toEqual([
      "/projects/new",
      "/app",
      "/site-walk",
      "/digital-twin",
      "/thermal-studio",
    ]);
    expect(VNEXT_OWNER_NAV.map((item) => item.href)).toEqual([
      "/vnext/ops",
      "/vnext/ops/clients",
      "/vnext/ops/projects",
      "/vnext/ops/processing",
      "/vnext/ops/qa",
      "/vnext/ops/shares",
      "/vnext/ops/settings",
      "/vnext/ops/account",
    ]);
  });

  it("keeps every nav href as an intentional vNext route", () => {
    for (const item of VNEXT_ALL_NAV) {
      expect(item.href, item.label).toBeTruthy();
      expect(isSafeVnextNavHref(item.href), item.href).toBe(true);
      expect(item.href.includes("#")).toBe(false);
      expect(item.href.toLowerCase().startsWith("javascript:")).toBe(false);
      for (const prefix of VNEXT_FORBIDDEN_NAV_PREFIXES) {
        expect(item.href === prefix || item.href.startsWith(`${prefix}/`)).toBe(false);
      }
    }
  });

  it("rejects empty, hash, javascript, and legacy destinations", () => {
    expect(isSafeVnextNavHref("")).toBe(false);
    expect(isSafeVnextNavHref("#projects")).toBe(false);
    expect(isSafeVnextNavHref("javascript:void(0)")).toBe(false);
    expect(isSafeVnextNavHref("/dashboard")).toBe(false);
    expect(isSafeVnextNavHref("/app")).toBe(false);
    expect(isSafeVnextNavHref("/site-walk")).toBe(false);
    expect(isSafeVnextNavHref("/preview/vnext/client")).toBe(false);
  });
});

describe("isVnextNavActive", () => {
  it("marks client Projects only on that route and nested project paths", () => {
    const projects = VNEXT_CLIENT_NAV[0];
    expect(isVnextNavActive("/vnext/projects", projects)).toBe(true);
    expect(isVnextNavActive("/vnext/projects/abc", projects)).toBe(true);
    expect(isVnextNavActive("/vnext/account", projects)).toBe(false);
  });

  it("marks client Account only on account", () => {
    const account = VNEXT_CLIENT_NAV[1];
    expect(isVnextNavActive("/vnext/account", account)).toBe(true);
    expect(isVnextNavActive("/vnext/projects", account)).toBe(false);
  });

  it("does not treat owner Home as active on nested ops routes", () => {
    const home = VNEXT_OWNER_PRIMARY_NAV[0];
    expect(isVnextNavActive("/vnext/ops", home)).toBe(true);
    expect(isVnextNavActive("/vnext/ops/clients", home)).toBe(false);
    expect(isVnextNavActive("/vnext/ops/qa", home)).toBe(false);
    expect(isVnextNavActive("/vnext/ops/account", home)).toBe(false);
  });

  it("matches nested owner destinations without lighting Home", () => {
    for (const item of VNEXT_OWNER_NAV) {
      expect(isVnextNavActive(item.href, item)).toBe(true);
      if (item.href !== "/vnext/ops") {
        expect(isVnextNavActive(item.href, VNEXT_OWNER_PRIMARY_NAV[0])).toBe(false);
      }
    }
  });

  it("matches QA & Publish on its path only", () => {
    const qa = VNEXT_OWNER_PRIMARY_NAV.find((item) => item.href === "/vnext/ops/qa");
    expect(qa).toBeTruthy();
    expect(isVnextNavActive("/vnext/ops/qa", qa!)).toBe(true);
    expect(isVnextNavActive("/vnext/ops/projects", qa!)).toBe(false);
  });
});
