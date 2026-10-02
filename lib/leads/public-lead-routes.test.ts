import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST as postContact } from "@/app/api/contact/route";
import { POST as postSiteVisit } from "@/app/api/site-visit-inquiry/route";

describe("public lead routes fail closed without mail", () => {
  it("rejects a contact submit when Resend is not configured", async () => {
    const req = new NextRequest("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Ada Lovelace",
        email: "ada@example.com",
        message: "Need a site visit",
      }),
    });
    const res = await postContact(req);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toMatch(/send/i);
    expect(JSON.stringify(body)).not.toContain("ada@example.com");
    expect(JSON.stringify(body)).not.toContain("Ada Lovelace");
  });

  it("rejects a site-visit submit when Resend is not configured", async () => {
    const form = new FormData();
    form.set("name", "Ada Lovelace");
    form.set("email", "ada@example.com");
    form.set("projectLocation", "1 Main St");
    const req = new NextRequest("http://localhost/api/site-visit-inquiry", {
      method: "POST",
      body: form,
    });
    const res = await postSiteVisit(req);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toMatch(/send/i);
    expect(JSON.stringify(body)).not.toContain("ada@example.com");
  });
});
