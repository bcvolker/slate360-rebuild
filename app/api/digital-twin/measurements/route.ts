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

    const label =
      typeof p.label === "string" && p.label.trim() ? p.label.trim() : APPROX_COORDINATION_LABEL;
    const incomingMeta =
      p.metadata && typeof p.metadata === "object" && !Array.isArray(p.metadata)
        ? (p.metadata as Record<string, unknown>)
        : {};
    const metric = incomingMeta.source === "metric-mesh";

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
        label,
        start_point: startPoint,
        end_point: endPoint,
        measured_value: measuredValue,
        unit,
        metadata: metric
          ? incomingMeta
          : {
              approximate: true,
              disclaimer: APPROX_COORDINATION_LABEL,
              ...incomingMeta,
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

export const PATCH = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return badRequest("Invalid JSON");
    }
    if (!payload || typeof payload !== "object") return badRequest("Invalid payload");
    const p = payload as Record<string, unknown>;
    const id = typeof p.id === "string" ? p.id.trim() : "";
    if (!id) return badRequest("id is required");
    if (!orgId) return notFound("Organization required");

    const { data: existing } = await admin
      .from("digital_twin_measurements")
      .select("id, org_id, metadata")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!existing) return notFound("Measurement not found");

    const patch: Record<string, unknown> = {};
    if (typeof p.label === "string" && p.label.trim()) patch.label = p.label.trim();
    if (typeof p.unit === "string" && ["m", "ft", "in", "mm"].includes(p.unit)) patch.unit = p.unit;
    if (typeof p.measured_value === "number" && Number.isFinite(p.measured_value)) {
      patch.measured_value = p.measured_value;
    }
    const prev =
      existing.metadata && typeof existing.metadata === "object"
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const nextMeta = { ...prev };
    if (typeof p.hidden === "boolean") nextMeta.hidden = p.hidden;
    if (p.metadata && typeof p.metadata === "object" && !Array.isArray(p.metadata)) {
      Object.assign(nextMeta, p.metadata as Record<string, unknown>);
    }
    patch.metadata = nextMeta;

    const { data, error } = await admin
      .from("digital_twin_measurements")
      .update(patch)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) return serverError(error.message);
    return ok({ measurement: data });
  });

export const DELETE = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
    if (!id) return badRequest("id is required");
    if (!orgId) return notFound("Organization required");

    const { data: existing } = await admin
      .from("digital_twin_measurements")
      .select("id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!existing) return notFound("Measurement not found");

    const { error } = await admin.from("digital_twin_measurements").delete().eq("id", id);
    if (error) return serverError(error.message);
    return ok({ deleted: true });
  });
