import { NextRequest, NextResponse } from "next/server";
import { ok, badRequest, notFound } from "@/lib/server/api-response";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";
import { canCommentOnItem, itemAccessDenied, toProjectItem, toProjectItemComment } from "@/lib/spatial-walkthrough/project-items";
import { emitItemEvent, loadLocators } from "@/lib/spatial-walkthrough/project-item-store";
import { makeItemEvent } from "@/lib/spatial-walkthrough/item-events";
import { readGuestKey, resolveShareAudience } from "@/lib/spatial-walkthrough/item-public-access";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string; itemId: string }> };

const checkRateLimit = createRateLimiter("spatial-walkthrough:public-item", 30, 60);

export const GET = async (req: NextRequest, ctx: Ctx) => {
  const limited = await checkRateLimit(req);
  if (limited) return limited;
  const { token, itemId } = await ctx.params;
  const share = await resolveShareAudience(req, token);
  if (!share.ok) return NextResponse.json(publicShareDenial(), { status: 404 });
  const { data: row } = await share.admin.from("spatial_project_items").select("*").eq("id", itemId).eq("org_id", share.row.org_id).maybeSingle();
  const locators = await loadLocators(share.admin, row ? [itemId] : []);
  const item = row ? toProjectItem(row as Record<string, unknown>, locators.get(itemId) ?? []) : null;
  const guest = await readGuestKey();
  if (!item || itemAccessDenied(item, share.audience, null, guest)) return notFound("Item not found");
  const { data: comments } = await share.admin.from("spatial_project_item_comments").select("id, body, created_at, voice_asset_id, file_document_id").eq("item_id", itemId).order("created_at");
  return ok({ item, comments: (comments ?? []).map((row) => toProjectItemComment(row as Record<string, unknown>)) });
};

export const POST = async (req: NextRequest, ctx: Ctx) => {
  const limited = await checkRateLimit(req);
  if (limited) return limited;
  const { token, itemId } = await ctx.params;
  const share = await resolveShareAudience(req, token);
  if (!share.ok) return NextResponse.json(publicShareDenial(), { status: 404 });
  if (!canCommentOnItem({ audience: share.audience, canAuthor: false })) {
    return NextResponse.json(publicShareDenial(), { status: 404 });
  }
  const { data: row } = await share.admin.from("spatial_project_items").select("*").eq("id", itemId).eq("org_id", share.row.org_id).maybeSingle();
  const locators = await loadLocators(share.admin, row ? [itemId] : []);
  const item = row ? toProjectItem(row as Record<string, unknown>, locators.get(itemId) ?? []) : null;
  const guest = await readGuestKey();
  if (!item || itemAccessDenied(item, share.audience, null, guest)) return notFound("Item not found");
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return badRequest("text required");
  const { data: comment, error } = await share.admin.from("spatial_project_item_comments").insert({
    org_id: share.row.org_id,
    item_id: itemId,
    body: text,
  }).select("id, body, created_at").single();
  if (error || !comment) return notFound("Item not found");
  await emitItemEvent(share.admin, { orgId: share.row.org_id, event: makeItemEvent("commented", itemId, item.projectId, null, { source: "share" }) });
  return ok({ comment }, 201);
};
