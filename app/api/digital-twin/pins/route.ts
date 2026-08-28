import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, notFound, serverError, created } from "@/lib/server/api-response";
import { isVec3 } from "@/lib/digital-twin/share-annotate";

const PIN_SELECT =
  "id, space_id, title, body, position, normal, pin_status, priority, trade, color, created_at, model_id";

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return badRequest("Invalid JSON");
    }
    if (!payload || typeof payload !== "object") return badRequest("Invalid payload");
    const p = payload as Record<string, unknown>;
    const spaceId = typeof p.space_id === "string" ? p.space_id.trim() : "";
    const title = typeof p.title === "string" ? p.title.trim() : "";
    const body = typeof p.body === "string" ? p.body.trim() : null;
    const position = p.position;
    const normal = isVec3(p.normal) ? p.normal : null;
    const modelId = typeof p.model_id === "string" ? p.model_id.trim() : null;
    const trade = typeof p.trade === "string" ? p.trade.trim() : null;

    if (!spaceId || !title) return badRequest("space_id and title are required");
    if (!orgId) return notFound("Organization required");
    if (!isVec3(position)) return badRequest("position {x,y,z} is required");

    const { data: space } = await admin
      .from("digital_twin_spaces")
      .select("id, org_id")
      .eq("id", spaceId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!space) return notFound("Twin space not found");

    const { data, error } = await admin
      .from("digital_twin_pins")
      .insert({
        org_id: orgId,
        space_id: spaceId,
        model_id: modelId,
        created_by: user.id,
        title,
        body,
        position,
        normal,
        trade,
      })
      .select(PIN_SELECT)
      .single();
    if (error) return serverError(error.message);
    return created({ pin: data });
  });

export const DELETE = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
    if (!id) return badRequest("id is required");
    if (!orgId) return notFound("Organization required");

    const { data: pin } = await admin
      .from("digital_twin_pins")
      .select("id, org_id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!pin) return notFound("Pin not found");
    if (pin.org_id !== orgId) return forbidden("Access denied");

    const { error } = await admin.from("digital_twin_pins").delete().eq("id", id);
    if (error) return serverError(error.message);
    return ok({ deleted: true });
  });
