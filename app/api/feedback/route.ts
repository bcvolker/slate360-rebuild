import type { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

const AttachmentSchema = z.object({
  url: z.string(),
  name: z.string(),
  size: z.number(),
  contentType: z.string(),
});

// Universal feedback payload from the in-app Help & Feedback modal.
// Maps to the live `beta_feedback` schema:
//   type             -> beta_feedback.type             (bug|feature|ux|performance|other)
//   severity         -> beta_feedback.severity         (blocker|high|medium|low)
//   category         -> appended to description (suggestion subtype)
//   stepsToReproduce -> beta_feedback.steps_to_reproduce
//   useCase          -> appended to description
//   pageUrl          -> beta_feedback.page_url
//   userAgent        -> beta_feedback.user_agent
//   attachments      -> beta_feedback.console_errors   (jsonb until S3 upload ships)
const FeedbackSchema = z.object({
  type: z.enum(["bug", "feature", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.string().max(120).optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  pageUrl: z.string().max(2048).optional().default(""),
  userAgent: z.string().max(1024).optional().default(""),
  stepsToReproduce: z.string().max(5000).optional(),
  useCase: z.string().max(1000).optional(),
  attachments: z.array(AttachmentSchema).optional(),
  // Legacy callers (older BetaFeedbackButton) used these — keep accepting them.
  appArea: z.string().max(100).optional(),
  replayUrl: z.string().max(500).optional(),
});

// Modal exposes "critical"; the table check constraint expects "blocker".
function mapSeverity(s: string | undefined): string | null {
  if (!s) return null;
  if (s === "critical") return "blocker";
  return s;
}

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

    const {
      type,
      severity,
      category,
      title,
      description,
      pageUrl,
      userAgent,
      stepsToReproduce,
      useCase,
      attachments,
      appArea,
      replayUrl,
    } = parsed.data;

    let finalDescription = description;
    if (type === "feature") {
      if (category) finalDescription += `\n\n**Category:** ${category}`;
      if (useCase) finalDescription += `\n\n**Use Case:**\n${useCase}`;
    }

    const consolePayload: Record<string, unknown> = {};
    if (attachments && attachments.length > 0) consolePayload.attachments = attachments;
    if (replayUrl) consolePayload.replayUrl = replayUrl;

    const { error } = await admin.from("beta_feedback").insert({
      user_id: user.id,
      org_id: orgId,
      type,
      title,
      description: finalDescription,
      severity: type === "bug" ? mapSeverity(severity) : null,
      app_area: appArea || (pageUrl ? pageUrl.split("?")[0] : null),
      page_url: pageUrl || null,
      user_agent: userAgent || null,
      steps_to_reproduce: type === "bug" ? stepsToReproduce ?? null : null,
      console_errors: Object.keys(consolePayload).length > 0 ? consolePayload : null,
      status: "new",
    });

    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") {
        return serverError("Feedback table not provisioned yet");
      }
      console.error("[Feedback Submission Error]", error);
      return serverError(error.message);
    }

    return ok({ ok: true });
  });
}

