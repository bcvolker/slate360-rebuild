import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTwinShareAnnotate } from "@/lib/digital-twin/share-annotate";
import { createTwinShareRateLimiter } from "@/lib/digital-twin/share-rate-limit";
import { notifyTwinShareActivity } from "@/lib/digital-twin/notify-twin-share";
import { ok, badRequest, forbidden, notFound, serverError, created } from "@/lib/server/api-response";

const checkRate = createTwinShareRateLimiter("twin-share:comment", 20, 60);

type Params = { params: Promise<{ token: string }> };

const COMMENT_SELECT =
  "id, space_id, subject_type, subject_id, author_display, body, parent_id, share_token_id, created_at";

export async function GET(_req: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  const gate = await resolveTwinShareAnnotate(token);
  if (!gate.ok) return notFound("Invalid or expired link");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("digital_twin_comments")
    .select(COMMENT_SELECT)
    .eq("share_token_id", gate.ctx.shareTokenId)
    .order("created_at", { ascending: true });

  if (error) return serverError(error.message);
  return ok({ comments: data ?? [] });
}

export async function POST(req: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  const blocked = await checkRate(req, token);
  if (blocked) return blocked;

  const gate = await resolveTwinShareAnnotate(token, { requireAnnotate: true });
  if (!gate.ok) {
    if (gate.reason === "forbidden") return forbidden("Annotate permission required");
    return notFound("Invalid or expired link");
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  if (!payload || typeof payload !== "object") return badRequest("Invalid payload");

  const p = payload as Record<string, unknown>;
  const authorDisplay = typeof p.author_display === "string" ? p.author_display.trim() : "";
  const body = typeof p.body === "string" ? p.body.trim() : "";
  const parentId = typeof p.parent_id === "string" ? p.parent_id.trim() : null;
  const subjectType =
    typeof p.subject_type === "string" && ["space", "pin"].includes(p.subject_type)
      ? p.subject_type
      : "space";
  const subjectId =
    typeof p.subject_id === "string" && p.subject_id.trim()
      ? p.subject_id.trim()
      : gate.ctx.spaceId;

  if (!authorDisplay || !body) return badRequest("author_display and body are required");
  if (authorDisplay.length > 120) return badRequest("Name too long");
  if (body.length > 8000) return badRequest("Comment too long");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("digital_twin_comments")
    .insert({
      org_id: gate.ctx.orgId,
      space_id: gate.ctx.spaceId,
      subject_type: subjectType,
      subject_id: subjectId,
      author_display: authorDisplay,
      body,
      parent_id: parentId,
      share_token_id: gate.ctx.shareTokenId,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error) return serverError(error.message);

  void notifyTwinShareActivity({
    spaceId: gate.ctx.spaceId,
    recipientUserId: gate.ctx.createdBy,
    title: "New twin share comment",
    message: `${authorDisplay} left a comment via share link.`,
  });

  return created({ comment: data });
}
