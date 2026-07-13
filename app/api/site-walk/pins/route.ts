/**
 * GET  /api/site-walk/pins?plan_id=... — list pins for a plan
 * POST /api/site-walk/pins — place a pin on a plan for an item
 *
 * The POST payload is the unified "long-press drop" body:
 *   { plan_id, item_id, x_pct, y_pct, pin_number?, pin_color?, markup_data? }
 *
 * The associated `item_id` is created separately via POST /api/site-walk/items
 * (which carries the title, notes, attachments). This route only places the
 * pin on the plan and stores any vector overlay data in `markup_data`.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, forbidden } from "@/lib/server/api-response";
import { SITE_WALK_PIN_STATUSES, type CreatePinPayload } from "@/lib/types/site-walk";
import { isMarkupData } from "@/lib/site-walk/markup-types";
import { canOrgWalkWithPlans } from "@/lib/site-walk/plan-walk-entitlement";

export const GET = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const planId = req.nextUrl.searchParams.get("plan_id");
    const planSheetId = req.nextUrl.searchParams.get("plan_sheet_id");
    const sessionId = req.nextUrl.searchParams.get("session_id");
    // session_id alone is allowed: the drawings walk needs every pin across all
    // sheets of a session to build the item→sheet index for cross-sheet stop nav.
    if (!planId && !planSheetId && !sessionId) {
      return badRequest("plan_id, plan_sheet_id, or session_id is required");
    }

    let query = admin
      .from("site_walk_pins")
      .select("*")
      .eq("org_id", orgId);

    if (planId) query = query.eq("plan_id", planId);
    else if (planSheetId) query = query.eq("plan_sheet_id", planSheetId);
    if (sessionId) query = query.eq("session_id", sessionId);

    const { data, error } = await query
      .order("pin_number", { ascending: true });

    if (error) return serverError(error.message);
    return ok({ pins: data ?? [] });
  });

export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId, user }) => {
    if (!orgId) return badRequest("Organization context required");
    // Every pin drop is a plan-walk action (plan_id/plan_sheet_id is required
    // below) — Pro-only per the pricing model, but nothing server-side enforced
    // that until now.
    if (!(await canOrgWalkWithPlans(admin, orgId))) {
      return forbidden("Walks with drawings require the Site Walk Pro plan.");
    }

    const body = (await req.json()) as CreatePinPayload;
    if (!body.plan_id && !body.plan_sheet_id) {
      return badRequest("plan_id or plan_sheet_id is required");
    }
    if (body.plan_id && !isUuid(body.plan_id)) {
      return badRequest("plan_id must be a saved UUID");
    }
    if (body.plan_sheet_id && !isUuid(body.plan_sheet_id)) {
      return badRequest("plan_sheet_id must be a saved UUID");
    }
    if (
      typeof body.x_pct !== "number" ||
      typeof body.y_pct !== "number" ||
      body.x_pct < 0 ||
      body.x_pct > 100 ||
      body.y_pct < 0 ||
      body.y_pct > 100
    ) {
      return badRequest("x_pct and y_pct must be numbers between 0 and 100");
    }
    if (body.markup_data !== undefined && !isMarkupData(body.markup_data)) {
      return badRequest("markup_data must match the MarkupData v1 schema");
    }
    if (body.pin_status !== undefined && !SITE_WALK_PIN_STATUSES.includes(body.pin_status)) {
      return badRequest(`pin_status must be one of: ${SITE_WALK_PIN_STATUSES.join(", ")}`);
    }

    // client_pin_id is the authoritative join key, minted at the long-press drop
    // (see docs/design/PLAN_PIN_ID_LIFECYCLE.md). When present, the POST is
    // IDEMPOTENT: a re-sent offline drop with the same client_pin_id updates the
    // existing pin instead of creating a duplicate (the round-one bug).
    const clientPinId = body.client_pin_id ?? null;

    async function findExisting() {
      if (!clientPinId) return null;
      const { data } = await admin
        .from("site_walk_pins")
        .select("*")
        .eq("org_id", orgId)
        .eq("created_by", user.id)
        .eq("client_pin_id", clientPinId)
        .maybeSingle();
      return data ?? null;
    }

    const existing = await findExisting();
    if (existing) {
      const { data: updated, error: updErr } = await admin
        .from("site_walk_pins")
        .update({
          x_pct: body.x_pct,
          y_pct: body.y_pct,
          item_id: body.item_id ?? existing.item_id,
          pin_number: body.pin_number ?? existing.pin_number,
          pin_color: body.pin_color ?? existing.pin_color,
          pin_status: body.pin_status ?? existing.pin_status,
          label: body.label ?? existing.label,
          markup_data: body.markup_data ?? existing.markup_data,
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (updErr) return serverError(updErr.message);
      return ok({ pin: updated }, 200);
    }

    const { data, error } = await admin
      .from("site_walk_pins")
      .insert({
        plan_id: body.plan_id ?? null,
        plan_sheet_id: body.plan_sheet_id ?? null,
        item_id: body.item_id ?? null,
        org_id: orgId,
        project_id: body.project_id ?? null,
        session_id: body.session_id ?? null,
        x_pct: body.x_pct,
        y_pct: body.y_pct,
        pin_number: body.pin_number ?? null,
        pin_color: body.pin_color ?? "blue",
        client_pin_id: clientPinId,
        pin_status: body.pin_status ?? (body.item_id ? "active" : "draft"),
        label: body.label ?? null,
        created_by: user.id,
        markup_data: body.markup_data ?? {},
      })
      .select()
      .single();

    if (error) {
      // Race: a concurrent re-send won the client_pin_id unique index. Return the
      // winner so the caller still gets its pin (idempotent), not a hard error.
      if (error.code === "23505") {
        const winner = await findExisting();
        if (winner) return ok({ pin: winner }, 200);
        return badRequest("Item already pinned to this plan");
      }
      return serverError(error.message);
    }
    return ok({ pin: data }, 201);
  });

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
