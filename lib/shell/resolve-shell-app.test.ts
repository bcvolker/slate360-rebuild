import { describe, it, expect } from "vitest";
import { resolveShellApp } from "./resolve-shell-app";

describe("resolveShellApp", () => {
  const cases: Array<[string, string]> = [
    ["/digital-twins", "twin360"],
    ["/digital-twin/x", "twin360"],
    ["/site-walks", "site-walk"],
    ["/site-walk/x", "site-walk"],
    ["/projects/abc/walks", "site-walk"],
    ["/projects/abc/twins", "twin360"],
    ["/slatedrop", "dashboard"],
    ["/projects", "dashboard"],
    ["/dashboard", "dashboard"],
    ["/", "dashboard"],
  ];
  it.each(cases)("%s -> %s", (path, expected) => {
    expect(resolveShellApp(path)).toBe(expected);
  });

  // Boundary-match hardening: sibling-prefix routes must NOT inherit an app accent.
  it("sibling prefix /site-walks-archive resolves to dashboard (boundary match)", () => {
    expect(resolveShellApp("/site-walks-archive")).toBe("dashboard");
  });
  it("/site-walking-guide resolves to dashboard", () => {
    expect(resolveShellApp("/site-walking-guide")).toBe("dashboard");
  });
  it("/digital-twins-export resolves to dashboard (boundary match)", () => {
    expect(resolveShellApp("/digital-twins-export")).toBe("dashboard");
  });
});
