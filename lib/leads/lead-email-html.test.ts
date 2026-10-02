import { describe, expect, it } from "vitest";
import { contactLeadHtml, siteVisitLeadHtml, type SiteVisitLead } from "./lead-email-html";

const base: SiteVisitLead = {
  name: "Ada <script>",
  email: "ada@example.com",
  company: "Acme",
  phone: "602-555-0100",
  projectLocation: "1 Main St",
  lat: 33.45,
  lng: -112.07,
  boundaryPointCount: 4,
  timeline: "This week",
  whatIsHappening: "Pour before cover",
  notes: "Gate code 123",
  attachmentName: null,
  attachmentStored: false,
  attachmentUrl: null,
};

describe("siteVisitLeadHtml", () => {
  it("includes the submitted fields and escapes markup", () => {
    const html = siteVisitLeadHtml(base);
    expect(html).toContain("Ada &lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("Acme");
    expect(html).toContain("602-555-0100");
    expect(html).toContain("1 Main St");
    expect(html).toContain("https://www.google.com/maps?q=33.45,-112.07");
    expect(html).toContain("boundary outlined");
    expect(html).toContain("This week");
    expect(html).toContain("Pour before cover");
    expect(html).toContain("Gate code 123");
  });

  it("links a stored attachment", () => {
    const html = siteVisitLeadHtml({
      ...base,
      attachmentName: "plan.pdf",
      attachmentStored: true,
      attachmentUrl: "https://files.example/plan.pdf?sig=1&exp=2",
    });
    expect(html).toContain("plan.pdf");
    expect(html).toContain("sig=1&amp;exp=2");
  });
});

describe("contactLeadHtml", () => {
  it("includes the message and escapes markup", () => {
    const html = contactLeadHtml({
      name: "Brian",
      email: "brian@example.com",
      message: "Hello\n<script>",
    });
    expect(html).toContain("Brian");
    expect(html).toContain("brian@example.com");
    expect(html).toContain("Hello<br/>&lt;script&gt;");
  });
});
