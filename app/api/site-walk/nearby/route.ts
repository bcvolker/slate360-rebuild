import { NextRequest } from "next/server";
import { withAuth, type AuthedContext } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, forbidden } from "@/lib/server/api-response";

export const GET = async (req: NextRequest) =>
  withAuth(req, async ({ orgId, admin }: AuthedContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const lat = searchParams.get("lat");
      const lng = searchParams.get("lng");
      const radius = searchParams.get("radius") ?? "50";
      
      // Allow overriding orgId if provided, but default to context orgId
      const targetOrgId = searchParams.get("org_id") || orgId;

      if (!lat || !lng || !targetOrgId) {
        return badRequest("Missing required params (lat, lng, or org_id)");
      }

      const { data, error } = await admin.rpc("get_nearby_photos", {
        p_lat: parseFloat(lat),
        p_lng: parseFloat(lng),
        p_radius_meters: parseFloat(radius),
        p_org_id: targetOrgId,
      });

      if (error) {
        return serverError(error.message);
      }

      return ok(data);
    } catch (e: any) {
      return serverError(e.message ?? "Failed to fetch nearby photos");
    }
  });