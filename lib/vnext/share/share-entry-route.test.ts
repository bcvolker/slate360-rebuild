import { beforeEach, describe, expect, it, vi } from "vitest";

const claim = vi.fn(async () => true);
const cookieValue = { current: undefined as string | undefined };
const shareState = { current: "active" as "active" | "unavailable" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookieValue.current ? { value: cookieValue.current } : undefined),
  }),
}));

vi.mock("@/lib/vnext/share/resolve-public-share", () => ({
  resolvePublicShare: async () => ({
    admin: {},
    share:
      shareState.current === "active"
        ? {
            state: "active",
            token: "a".repeat(43),
            projectId: "project-a",
            projectName: "Harbor",
            target: "project",
            sections: ["overview"],
            view: null,
          }
        : { state: "unavailable" },
  }),
  claimResolvedShare: () => claim(),
}));

describe("public share entry route", () => {
  beforeEach(() => {
    claim.mockClear();
    cookieValue.current = undefined;
    shareState.current = "active";
  });

  it("claims once for a new session and skips when the session cookie is already set", async () => {
    const { POST } = await import("@/app/share/project/[token]/entry/route");
    const token = "a".repeat(43);
    const first = await POST(new Request("http://127.0.0.1/share/project/entry"), {
      params: Promise.resolve({ token }),
    });
    expect(first.status).toBe(204);
    expect(first.headers.get("set-cookie")).toContain("s360_share_open=1");
    expect(claim).toHaveBeenCalledTimes(1);

    cookieValue.current = "1";
    const second = await POST(new Request("http://127.0.0.1/share/project/entry"), {
      params: Promise.resolve({ token }),
    });
    expect(second.status).toBe(204);
    expect(second.headers.get("set-cookie")).toBeNull();
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it("does not claim a revoked or expired link", async () => {
    shareState.current = "unavailable";
    cookieValue.current = "1";
    const { POST } = await import("@/app/share/project/[token]/entry/route");
    const response = await POST(new Request("https://slate360.ai/share/project/entry"), {
      params: Promise.resolve({ token: "a".repeat(43) }),
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(claim).not.toHaveBeenCalled();
  });
});
