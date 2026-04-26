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
  appArea: z.string().max(100).optional().default(""),
  attachments: z.array(z.object({
    name: z.string().max(200),
    type: z.string().max(100),
    size: z.number().int().nonnegative().max(2_000_000),
    dataUrl: z.string().max(3_000_000),
  })).max(3).optional().default([]),
});

const typeMap: Record<z.infer<typeof FeedbackSchema>["category"], string> = {
  bug: "bug",
  suggestion: "feature",
  praise: "other",
  other: "other",
};

const severityMap: Record<string, string> = {
  critical: "blocker",
  high: "high",
  medium: "medium",
  low: "low",
};

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

    const { category, title, description, severity, pageUrl, userAgent, replayUrl, appArea, attachments } = parsed.data;

    const { error } = await admin.from("beta_feedback").insert({
      user_id: user.id,
      org_id: orgId,
      type: typeMap[category],
      title,
      description,
      severity: severity ? severityMap[severity] : null,
      app_area: appArea || null,
      page_url: pageUrl || null,
      user_agent: userAgent || null,
      console_errors: replayUrl || attachments.length > 0 ? { replayUrl: replayUrl || null, attachments } : null,
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
