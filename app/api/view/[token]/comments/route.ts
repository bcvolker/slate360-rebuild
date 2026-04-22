/**
 * Public comments API for the deliverable viewer (`/view/[token]`).
 * The share token itself is the access control. All reads/writes use the
 * admin client; we never expose this route's data to authenticated clients
 * outside the token-gated path.
 */

import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { createRateLimiter } from "@/lib/server/rate-limit";

const checkRate = createRateLimiter("viewer:comment", 20, 60);

interface Params {
  params: Promise<{ token: string }>;
}

function isValidToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{16,64}$/.test(token);
}

async function resolveDeliverable(token: string) {
  if (!isValidToken(token)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_walk_deliverables")
    .select("id, share_revoked, share_expires_at")
    .eq("share_token", token)
    .maybeSingle<{ id: string; share_revoked: boolean | null; share_expires_at: string | null }>();
  if (error || !data) return null;
  if (data.share_revoked) return null;
  if (
    data.share_expires_at &&
    new Date(data.share_expires_at).getTime() < Date.now()
  ) {
    return null;
  }
  return data.id;
}

export async function GET(req: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  const itemId = req.nextUrl.searchParams.get("itemId");
  if (!itemId) return badRequest("itemId is required");

  const deliverableId = await resolveDeliverable(token);
  if (!deliverableId) return notFound("Invalid or expired link");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("viewer_comments")
    .select("id, deliverable_id, item_id, parent_id, author_user_id, author_name, author_email, body, created_at, is_field, is_escalation, comment_intent")
    .eq("deliverable_id", deliverableId)
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) return serverError(error.message);
  return ok({ comments: data ?? [] });
}

export async function POST(req: NextRequest, ctx: Params) {
  const blocked = await checkRate(req);
  if (blocked) return blocked;

  const { token } = await ctx.params;
  const deliverableId = await resolveDeliverable(token);
  if (!deliverableId) return notFound("Invalid or expired link");

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  if (!payload || typeof payload !== "object") return badRequest("Invalid payload");

  const p = payload as Record<string, unknown>;
  const itemId = typeof p.itemId === "string" ? p.itemId.trim() : "";
  const name = typeof p.name === "string" ? p.name.trim() : "";
  const body = typeof p.body === "string" ? p.body.trim() : "";
  const email = typeof p.email === "string" ? p.email.trim() : "";
  const isField = p.is_field === true;
  const isEscalation = p.is_escalation === true;
  const intentRaw = typeof p.intent === "string" ? p.intent.trim() : "";
  const intent = ["approve", "needs_change", "question", "comment"].includes(intentRaw)
    ? intentRaw
    : null;

  if (!itemId || !name || !body) return badRequest("Missing required fields");
  if (name.length > 120) return badRequest("Name too long");
  if (body.length > 2000) return badRequest("Comment too long");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("viewer_comments")
    .insert({
      deliverable_id: deliverableId,
      item_id: itemId,
      author_name: name,
      author_email: email || null,
      body,
      is_field: isField,
      is_escalation: isEscalation,
      comment_intent: intent,
    })
    .select("id, deliverable_id, item_id, parent_id, author_user_id, author_name, author_email, body, created_at, is_field, is_escalation, comment_intent")
    .single();

  if (error) return serverError(error.message);
  return ok({ comment: data });
}
