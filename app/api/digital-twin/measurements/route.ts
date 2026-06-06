import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

const SELECT =
  "id, space_id, label, start_point, end_point, measured_value, unit, metadata, created_at";

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
