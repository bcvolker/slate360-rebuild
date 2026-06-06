import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isVec3, resolveTwinShareAnnotate } from "@/lib/digital-twin/share-annotate";
import { createTwinShareRateLimiter } from "@/lib/digital-twin/share-rate-limit";
import { notifyTwinShareActivity } from "@/lib/digital-twin/notify-twin-share";
import { ok, badRequest, forbidden, notFound, serverError, created } from "@/lib/server/api-response";

const checkRate = createTwinShareRateLimiter("twin-share:pin", 12, 60);

type Params = { params: Promise<{ token: string }> };

const PIN_SELECT =
  "id, space_id, title, body, position, normal, pin_status, priority, trade, color, created_at";

export async function GET(_req: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  const gate = await resolveTwinShareAnnotate(token);
  if (!gate.ok) return notFound("Invalid or expired link");

  const admin = createAdminClient();
  const { data: links, error: linkError } = await admin
    .from("digital_twin_comments")
    .select("subject_id")
    .eq("share_token_id", gate.ctx.shareTokenId)
    .eq("subject_type", "pin");

  if (linkError) return serverError(linkError.message);

  const pinIds = (links ?? []).map((row) => row.subject_id);
  if (pinIds.length === 0) return ok({ pins: [] });

  const { data, error } = await admin
    .from("digital_twin_pins")
    .select(PIN_SELECT)
    .in("id", pinIds)
    .eq("space_id", gate.ctx.spaceId)
    .order("created_at", { ascending: true });

  if (error) return serverError(error.message);
  return ok({ pins: data ?? [] });
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
  const title = typeof p.title === "string" ? p.title.trim() : "";
  const body = typeof p.body === "string" ? p.body.trim() : null;
  const position = p.position;
  const normal = p.normal;
  const modelId = typeof p.model_id === "string" ? p.model_id.trim() : null;

  if (!authorDisplay || !title) return badRequest("author_display and title are required");
  if (!isVec3(position)) return badRequest("position {x,y,z} is required");
  if (authorDisplay.length > 120) return badRequest("Name too long");
  if (title.length > 200) return badRequest("Title too long");

  const admin = createAdminClient();
  const { data: pin, error: pinError } = await admin
    .from("digital_twin_pins")
    .insert({
      org_id: gate.ctx.orgId,
      space_id: gate.ctx.spaceId,
      model_id: modelId,
      created_by: gate.ctx.createdBy,
      title: `[${authorDisplay}] ${title}`,
      body,
      position,
      normal: isVec3(normal) ? normal : null,
      pin_status: "open",
      color: "blue",
    })
    .select(PIN_SELECT)
    .single();

  if (pinError) return serverError(pinError.message);

  const { error: linkError } = await admin.from("digital_twin_comments").insert({
    org_id: gate.ctx.orgId,
    space_id: gate.ctx.spaceId,
    subject_type: "pin",
    subject_id: pin.id,
    author_display: authorDisplay,
    body: body ?? title,
    share_token_id: gate.ctx.shareTokenId,
  });

  if (linkError) return serverError(linkError.message);

  void notifyTwinShareActivity({
    spaceId: gate.ctx.spaceId,
    recipientUserId: gate.ctx.createdBy,
    title: "New twin share pin",
    message: `${authorDisplay} dropped a pin via share link.`,
  });

  return created({ pin });
}
