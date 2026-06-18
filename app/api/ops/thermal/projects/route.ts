import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

/** Lists the org's projects for linking a thermal session (CEO-only, via thermal auth). */
export const GET = (req: NextRequest) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return ok({ projects: [] });
    const { data, error } = await admin
      .from("projects")
      .select("id, name")
      .eq("org_id", orgId)
      .order("name", { ascending: true });
    if (error) return serverError(error.message);
    return ok({ projects: data ?? [] });
  });
