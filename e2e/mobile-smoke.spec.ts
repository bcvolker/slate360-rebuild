import { expect, test } from "@playwright/test";

test.describe("mobile smoke", () => {
  test("homepage contains mobile overflow guards and hero copy", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);

    const html = await response.text();
    expect(html).toContain("See it. Experience it.");
    expect(html).toContain("overflow-x-hidden");
  });

  test("dashboard redirects to login with redirectTo", async ({ request }) => {
    const response = await request.get("/dashboard", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toContain("/login?redirectTo=%2Fdashboard");
  });

  test("project hub redirects to login with redirectTo", async ({ request }) => {
    const response = await request.get("/project-hub", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toContain("/login?redirectTo=%2Fproject-hub");
  });

  test("design studio feature route serves expected content", async ({ request }) => {
    const response = await request.get("/features/design-studio");
    expect(response.status()).toBe(200);

    const html = await response.text();
    expect(html).toContain("Design Studio");
    expect(html).toContain("Try Demo");
  });
});
