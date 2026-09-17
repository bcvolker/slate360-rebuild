import { describe, expect, it } from "vitest";
import {
  VNEXT_CLIENT_NAV,
  VNEXT_OWNER_PRIMARY_NAV,
  isVnextNavActive,
} from "./nav";

describe("isVnextNavActive", () => {
  it("marks client Projects only on that route", () => {
    const projects = VNEXT_CLIENT_NAV[0];
    expect(isVnextNavActive("/vnext/projects", projects)).toBe(true);
    expect(isVnextNavActive("/vnext/account", projects)).toBe(false);
  });

  it("does not treat owner Home as active on nested ops routes", () => {
    const home = VNEXT_OWNER_PRIMARY_NAV[0];
    expect(isVnextNavActive("/vnext/ops", home)).toBe(true);
    expect(isVnextNavActive("/vnext/ops/clients", home)).toBe(false);
    expect(isVnextNavActive("/vnext/ops/qa", home)).toBe(false);
  });

  it("matches QA & Publish on its path only", () => {
    const qa = VNEXT_OWNER_PRIMARY_NAV.find((item) => item.href === "/vnext/ops/qa");
    expect(qa).toBeTruthy();
    expect(isVnextNavActive("/vnext/ops/qa", qa!)).toBe(true);
    expect(isVnextNavActive("/vnext/ops/projects", qa!)).toBe(false);
  });
});
