import { sendEmail } from "@/lib/email";
import { resolveInquiryInbox } from "@/lib/leads/inquiry-inbox";

/** Strip addresses so a provider error cannot echo a lead into server logs. */
export function leadSendFailureMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "unknown";
  return message.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]");
}

/** Sends a lead notification. Throws when Resend cannot accept it. */
export async function deliverLeadEmail(input: {
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  await sendEmail({
    to: resolveInquiryInbox(),
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
  });
}
