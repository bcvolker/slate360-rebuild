/**
 * Inbox for public lead forms (homepage site-visit request and /contact).
 * SITE_VISIT_INQUIRY_EMAIL overrides the default. A blank value does not.
 */
export const DEFAULT_INQUIRY_INBOX = "slate360ceo@gmail.com";

export function resolveInquiryInbox(raw?: string | null): string {
  const specific = (raw === undefined ? process.env.SITE_VISIT_INQUIRY_EMAIL : raw)?.trim();
  if (specific) return specific;
  return DEFAULT_INQUIRY_INBOX;
}
