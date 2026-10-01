import { expect, test } from "@playwright/test";

const ID = "11111111-1111-4111-8111-111111111111";

test.describe("phase 1 route cutover", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  test("legacy project routes preserve the project id on the first redirect", async ({ request }) => {
    const cases: Array<[string, string]> = [
      ["/projects", "/vnext/projects"],
      [`/projects/${ID}`, `/vnext/projects/${ID}`],
      [`/projects/${ID}/slatedrop`, `/vnext/projects/${ID}/documents`],
      [`/projects/${ID}/twins`, `/vnext/projects/${ID}/explore`],
      [`/projects/${ID}/walks`, `/vnext/projects/${ID}/history`],
      [`/projects/${ID}/punch-list`, `/vnext/projects/${ID}/items`],
      [`/projects/${ID}/plans`, `/vnext/projects/${ID}/documents`],
    ];
    for (const [from, to] of cases) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), from).toBeGreaterThanOrEqual(300);
      expect(response.status(), from).toBeLessThan(400);
      expect(response.headers()["location"] ?? "", from).toContain(to);
    }
  });

  test("operational routes and specialized links are not sent to vNext", async ({ request }) => {
    const retained = [
      "/projects/new",
      `/projects/${ID}/deliverables`,
      `/projects/${ID}/team`,
      `/projects/${ID}/people`,
      `/projects/${ID}/photos`,
      "/site-walk/capture-v2",
      "/app",
      "/share/twin/token",
      "/share/thermal/token",
      "/share/deliverable/token",
      "/view/token",
      "/portal/token",
      "/operations-console/feedback",
    ];
    for (const path of retained) {
      const response = await request.get(path, { maxRedirects: 0 });
      const location = response.headers()["location"] ?? "";
      expect(location.includes("/vnext/"), path).toBe(false);
    }
    const share = await request.get("/share/project/token", { maxRedirects: 0 });
    expect(share.headers()["location"] ?? "").not.toContain("/vnext/");
  });

  test("unauthenticated dashboard and field shell keep their own login targets", async ({ request }) => {
    const dashboard = await request.get("/dashboard", { maxRedirects: 0 });
    expect(dashboard.headers()["location"] ?? "").toContain("redirectTo=%2Fdashboard");
    const field = await request.get("/app", { maxRedirects: 0 });
    expect(field.headers()["location"] ?? "").toContain("redirectTo=%2Fapp");
    const capture = await request.get("/site-walk/capture-v2", { maxRedirects: 0 });
    expect(capture.headers()["location"] ?? "").toContain("redirectTo=%2Fsite-walk%2Fcapture-v2");
    const created = await request.get("/projects/new", { maxRedirects: 0 });
    expect(created.headers()["location"] ?? "").toContain("redirectTo=%2Fprojects%2Fnew");
  });

  test("owner console home redirects toward /vnext/ops", async ({ request }) => {
    const home = await request.get("/operations-console", { maxRedirects: 0 });
    expect(home.headers()["location"] ?? "").toContain("/vnext/ops");
    const ceo = await request.get("/ceo", { maxRedirects: 0 });
    expect(ceo.headers()["location"] ?? "").toContain("/vnext/ops");
  });
});
