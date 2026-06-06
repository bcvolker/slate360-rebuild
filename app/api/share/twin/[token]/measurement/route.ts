import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isVec3, resolveTwinShareAnnotate } from "@/lib/digital-twin/share-annotate";
import { createTwinShareRateLimiter } from "@/lib/digital-twin/share-rate-limit";
import { ok, badRequest, forbidden, notFound, serverError, created } from "@/lib/server/api-response";

const checkRate = createTwinShareRateLimiter("twin-share:measurement", 10, 60);

const APPROX_LABEL =
  "Approximate — for visual coordination, not survey. Requires metric scale.";

type Params = { params: Promise<{ token: string }> };

const MEASURE_SELECT =
  "id, space_id, label, start_point, end_point, measured_value, unit, metadata, created_at";

export async function GET(_req: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  const gate = await resolveTwinShareAnnotate(token);
  if (!gate.ok) return notFound("Invalid or expired link");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("digital_twin_measurements")
    .select(MEASURE_SELECT)
    .eq("space_id", gate.ctx.spaceId)
    .contains("metadata", { share_token_id: gate.ctx.shareTokenId })
    .order("created_at", { ascending: false });

  if (error) return serverError(error.message);
  return ok({ measurements: data ?? [] });
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
    typeof p.label === "string" && p.label.trim() ? p.label.trim() : APPROX_LABEL;

  if (!authorDisplay) return badRequest("author_display is required");
  if (!isVec3(startPoint) || !isVec3(endPoint)) {
    return badRequest("start_point and end_point {x,y,z} are required");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("digital_twin_measurements")
    .insert({
      org_id: gate.ctx.orgId,
      space_id: gate.ctx.spaceId,
      model_id: modelId,
      created_by: gate.ctx.createdBy,
      label,
      start_point: startPoint,
      end_point: endPoint,
      measured_value: measuredValue,
      unit,
      metadata: {
        share_token_id: gate.ctx.shareTokenId,
        author_display: authorDisplay,
        approximate: true,
        disclaimer: APPROX_LABEL,
      },
    })
    .select(MEASURE_SELECT)
    .single();

  if (error) return serverError(error.message);
  return created({ measurement: data });
}
