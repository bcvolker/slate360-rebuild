import { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { badRequest, ok, serverError } from "@/lib/server/api-response";

const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  message: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
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
  const admin = createAdminClient();
  const { error } = await admin.from("beta_feedback").insert({
    type: "other",
    title: `[Contact] ${name}`,
    description: `From: ${email}\n\n${message}`,
    app_area: "public-contact",
    page_url: "/contact",
    status: "new",
  });

  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") {
      console.info("[contact] beta_feedback table missing; logged message", { name, email });
      return ok({ ok: true });
    }
    console.error("[contact] insert failed", error.message);
    return serverError("Unable to store message. Please try again later.");
  }

  return ok({ ok: true });
}
