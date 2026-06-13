import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

type RevokePayload = { token: string };

export const POST = (req: NextRequest) =>
  withThermalOpsAuth(req, async ({ admin, req: request }) => {
    const body = (await request.json().catch(() => null)) as RevokePayload | null;
    if (!body?.token) return badRequest("token is required");

    const { error } = await admin
      .from("thermal_analysis_share_tokens")
      .update({ is_revoked: true, updated_at: new Date().toISOString() })
      .eq("token", body.token);

    if (error) return serverError(error.message);
    return ok({ revoked: true });
  });
