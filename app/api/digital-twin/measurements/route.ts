import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError, created } from "@/lib/server/api-response";
import { isVec3 } from "@/lib/digital-twin/share-annotate";
import { APPROX_COORDINATION_LABEL } from "@/lib/digital-twin/measure-helpers";

const SELECT =
  "id, space_id, label, start_point, end_point, measured_value, unit, metadata, created_at";

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
    const startPoint = p.start_point;
    const endPoint = p.end_point;
    const measuredValue =
      typeof p.measured_value === "number" && Number.isFinite(p.measured_value)
        ? p.measured_value
        : null;
    const unit =
      typeof p.unit === "string" && ["m", "ft", "in", "mm"].includes(p.unit) ? p.unit : "m";
    const modelId = typeof p.model_id === "string" ? p.model_id.trim() : null;

    if (!spaceId) return badRequest("space_id is required");
    if (!orgId) return notFound("Organization required");
    if (!isVec3(startPoint) || !isVec3(endPoint)) {
      return badRequest("start_point and end_point {x,y,z} are required");
    }

    const { data: space } = await admin
      .from("digital_twin_spaces")
      .select("id")
      .eq("id", spaceId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!space) return notFound("Twin space not found");

    const { data, error } = await admin
      .from("digital_twin_measurements")
      .insert({
        org_id: orgId,
        space_id: spaceId,
        model_id: modelId,
        created_by: user.id,
        label: APPROX_COORDINATION_LABEL,
        start_point: startPoint,
        end_point: endPoint,
        measured_value: measuredValue,
        unit,
        metadata: {
          approximate: true,
          disclaimer: APPROX_COORDINATION_LABEL,
        },
      })
      .select(SELECT)
      .single();

    if (error) return serverError(error.message);
    return created({ measurement: data });
  });

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    const spaceId = req.nextUrl.searchParams.get("space_id")?.trim();
    if (!spaceId) return badRequest("space_id is required");
    if (!orgId) return notFound("Organization required");

    const { data: space } = await admin
      .from("digital_twin_spaces")
      .select("id")
      .eq("id", spaceId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!space) return notFound("Twin space not found");

    const { data, error } = await admin
      .from("digital_twin_measurements")
      .select(SELECT)
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ measurements: data ?? [] });
  });
