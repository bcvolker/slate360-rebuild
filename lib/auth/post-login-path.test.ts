import { describe, expect, it } from "vitest";
import {
  applyDeviceFork,
  CEO_POST_LOGIN_PATH,
  matchesOwnerEmail,
  resolvePostLoginPath,
} from "./post-login-path";

describe("resolvePostLoginPath", () => {
  it("sends the CEO to the operations console when no deep link is set", () => {
    expect(resolvePostLoginPath({ isCeo: true })).toBe("/operations-console");
    expect(resolvePostLoginPath({ isCeo: true, requestedPath: null })).toBe("/operations-console");
    expect(resolvePostLoginPath({ isCeo: true, requestedPath: "/app" })).toBe("/operations-console");
    expect(resolvePostLoginPath({ isCeo: true, requestedPath: "/app?from=login" })).toBe(
      "/operations-console",
    );
  });

  it("keeps every other account on /app", () => {
    expect(resolvePostLoginPath({ isCeo: false })).toBe("/app");
    expect(resolvePostLoginPath({ isCeo: false, requestedPath: "/app" })).toBe("/app");
    expect(resolvePostLoginPath({ isCeo: false, requestedPath: "  " })).toBe("/app");
  });

  it("honors explicit deep links for the CEO and for everyone else", () => {
    expect(resolvePostLoginPath({ isCeo: true, requestedPath: "/digital-twin" })).toBe("/digital-twin");
    expect(resolvePostLoginPath({ isCeo: true, requestedPath: "/projects/abc" })).toBe("/projects/abc");
    expect(resolvePostLoginPath({ isCeo: false, requestedPath: "/dashboard" })).toBe("/dashboard");
    expect(resolvePostLoginPath({ isCeo: false, requestedPath: "/site-walk" })).toBe("/site-walk");
  });

  it("rejects open redirects and falls back to the role home", () => {
    expect(resolvePostLoginPath({ isCeo: true, requestedPath: "https://evil.example" })).toBe(
      "/operations-console",
    );
    expect(resolvePostLoginPath({ isCeo: false, requestedPath: "//evil.example" })).toBe("/app");
    expect(resolvePostLoginPath({ isCeo: true, requestedPath: "/\\evil" })).toBe("/operations-console");
  });

  it("does not let the desktop /app ↔ /dashboard fork rewrite the CEO landing", () => {
    const landing = resolvePostLoginPath({ isCeo: true });
    expect(landing).toBe(CEO_POST_LOGIN_PATH);
    expect(applyDeviceFork(landing, false)).toBe("/operations-console");
    expect(applyDeviceFork(landing, true)).toBe("/operations-console");
    expect(applyDeviceFork("/app", false)).toBe("/dashboard");
    expect(applyDeviceFork("/dashboard", true)).toBe("/app");
  });
});

describe("matchesOwnerEmail", () => {
  it("matches CEO_EMAIL case-insensitively and fails closed without it", () => {
    expect(matchesOwnerEmail("Brian@Slate360.ai", "brian@slate360.ai")).toBe(true);
    expect(matchesOwnerEmail("other@slate360.ai", "brian@slate360.ai")).toBe(false);
    expect(matchesOwnerEmail("brian@slate360.ai", undefined)).toBe(false);
    expect(matchesOwnerEmail(null, "brian@slate360.ai")).toBe(false);
  });
});
