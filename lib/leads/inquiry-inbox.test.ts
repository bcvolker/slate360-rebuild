import { describe, expect, it } from "vitest";
import { leadSendFailureMessage } from "./deliver-lead-email";
import { DEFAULT_INQUIRY_INBOX, resolveInquiryInbox } from "./inquiry-inbox";

describe("resolveInquiryInbox", () => {
  it("uses the founder inbox when no override is set", () => {
    expect(resolveInquiryInbox(null)).toBe(DEFAULT_INQUIRY_INBOX);
    expect(resolveInquiryInbox("")).toBe(DEFAULT_INQUIRY_INBOX);
    expect(DEFAULT_INQUIRY_INBOX).toBe("slate360ceo@gmail.com");
  });

  it("ignores a blank override", () => {
    expect(resolveInquiryInbox("   ")).toBe(DEFAULT_INQUIRY_INBOX);
  });

  it("prefers SITE_VISIT_INQUIRY_EMAIL when set", () => {
    expect(resolveInquiryInbox(" leads@slate360.ai ")).toBe("leads@slate360.ai");
  });
});

describe("leadSendFailureMessage", () => {
  it("redacts email addresses from provider errors", () => {
    const message = leadSendFailureMessage(new Error("rejected ada@example.com"));
    expect(message).toBe("rejected [email]");
    expect(message).not.toContain("ada@example.com");
  });
});
