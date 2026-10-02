import { NextRequest } from "next/server";
import { z } from "zod";
import { deliverLeadEmail, leadSendFailureMessage } from "@/lib/leads/deliver-lead-email";
import { contactLeadHtml } from "@/lib/leads/lead-email-html";
import { createAdminClient } from "@/lib/supabase/admin";
import { badRequest, ok, serverError } from "@/lib/server/api-response";
import { createRateLimiter } from "@/lib/server/rate-limit";

const checkRate = createRateLimiter("lead:contact", 5, 900);

const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  message: z.string().min(1).max(5000),
});

/**
 * Public /contact form. Email delivery is required. The beta_feedback row
 * is a copy for the operations console and must not stand in for the email.
 */
export async function POST(req: NextRequest) {
  const limited = await checkRate(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
  }

  const { name, email, message } = parsed.data;

  try {
    await deliverLeadEmail({
      subject: `Contact form — ${name}`,
      html: contactLeadHtml({ name, email, message }),
      replyTo: email,
    });
  } catch (err) {
    console.error("[contact] email send failed", leadSendFailureMessage(err));
    return serverError("Unable to send message. Please try again.");
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("beta_feedback").insert({
      type: "other",
      title: `[Contact] ${name}`,
      description: `From: ${email}\n\n${message}`,
      app_area: "public-contact",
      page_url: "/contact",
      status: "new",
    });
    if (error && error.code !== "PGRST205" && error.code !== "42P01") {
      console.warn("[contact] feedback row not stored");
    }
  } catch {
    console.warn("[contact] feedback row skipped");
  }

  return ok({ ok: true });
}
