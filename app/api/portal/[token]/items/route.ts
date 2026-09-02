import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { ok, badRequest } from "@/lib/server/api-response";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";
import { loadProjectShareRow, shareDenied, projectSharePasswordOk, recordPortalAudit } from "@/lib/spatial-walkthrough/project-share";
import { sessionUnlocksShare } from "@/lib/spatial-walkthrough/share-session";
import { insertLocator, emitItemEvent } from "@/lib/spatial-walkthrough/project-item-store";
import { makeItemEvent } from "@/lib/spatial-walkthrough/item-events";
import { mintGuestKey, readGuestKey, GUEST_COOKIE } from "@/lib/spatial-walkthrough/item-public-access";
import { cookies } from "next/headers";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

const checkRateLimit = createRateLimiter("portal:items:create", 12, 60);

/**
 * "Ask about this" for the client portal — a client posts a question or
 * observation, optionally pinned to a walkthrough locator (walk/clip/t/yaw/
 * pitch), from a project-level share. Text only for Monday; voice/file
 * attachment stays on the ported per-walkthrough /ask route.
 */
export const POST = async (req: NextRequest, ctx: Ctx) => {
  const limited = await checkRateLimit(req);
  if (limited) return limited;
  const { token } = await ctx.params;
  const { admin, row, grants } = await loadProjectShareRow(token);
  if (shareDenied(row) || !row) return NextResponse.json(publicShareDenial(), { status: 404 });
  const unlocked = sessionUnlocksShare({ req, tokenHash: row.token_hash, passwordHash: row.password_hash });
  const pass = req.headers.get("x-portal-pass") || req.nextUrl.searchParams.get("code");
  if (!unlocked && !projectSharePasswordOk(row, pass)) return NextResponse.json(publicShareDenial(), { status: 401 });
  if (!grants.can_create_items) return NextResponse.json(publicShareDenial(), { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return badRequest("title required");
  const type = body?.type === "observation" ? "observation" : "question";

  let guestKey = await readGuestKey();
  const jar = await cookies();
  if (!guestKey) {
    guestKey = mintGuestKey();
    jar.set(GUEST_COOKIE, guestKey, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }

  const { data: item, error } = await admin
    .from("spatial_project_items")
    .insert({
      org_id: row.org_id,
      project_id: row.project_id,
      type,
      title,
      description: typeof body?.description === "string" ? body.description.trim() : null,
      status: "open",
      priority: "normal",
      guest_key: guestKey,
      visibility: "client",
    })
    .select("id")
    .single();
  if (error || !item) return NextResponse.json(publicShareDenial(), { status: 500 });

  const walkthroughId = typeof body?.walkthroughId === "string" ? body.walkthroughId : null;
  if (walkthroughId) {
    await insertLocator(admin, row.org_id, item.id, {
      walkthroughId,
      clipId: typeof body?.clipId === "string" ? body.clipId : null,
      chapterId: null,
      tSeconds: typeof body?.t === "number" ? body.t : null,
      yawDeg: typeof body?.yaw === "number" ? body.yaw : null,
      pitchDeg: typeof body?.pitch === "number" ? body.pitch : null,
    });
  }

  await emitItemEvent(admin, {
    orgId: row.org_id,
    event: makeItemEvent("created", item.id, row.project_id, null, { title, guestKey }, walkthroughId),
  });
  await recordPortalAudit(admin, { orgId: row.org_id, projectId: row.project_id, shareId: row.id, event: "portal_item_created", metadata: { itemId: item.id } });

  return ok({ id: item.id }, 201);
};
