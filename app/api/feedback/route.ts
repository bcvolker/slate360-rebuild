import type { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

const FeedbackSchema = z.object({
  category: z.enum(["bug", "suggestion", "praise", "other"]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  pageUrl: z.string().max(500).optional().default(""),
  userAgent: z.string().max(500).optional().default(""),
  replayUrl: z.string().max(500).optional().default(""),
});

export async function POST(req: NextRequest) {
  return withAuth(req, async ({ user, admin, orgId }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const parsed = FeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const { category, title, description, severity, pageUrl, userAgent, replayUrl } = parsed.data;

    const { error } = await admin.from("beta_feedback").insert({
      user_id: user.id,
      org_id: orgId,
      category,
      title,
      description,
      severity: severity ?? null,
      page_url: pageUrl || null,
      user_agent: userAgent || null,
      replay_url: replayUrl || null,
      status: "new",
    });

    if (error) {
      // PGRST205 / 42P01 = table missing — surface clean error so we know to apply migration
      if (error.code === "PGRST205" || error.code === "42P01") {
        return serverError("Feedback table not provisioned yet");
      }
      return serverError(error.message);
    }

    return ok({ ok: true });
  });
}
