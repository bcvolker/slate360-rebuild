import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { redeemInvitationToken } from "@/lib/server/invites";

export const runtime = "nodejs";

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin }) => {
    const body = (await req.json().catch(() => ({}))) as { token?: string };
    const token = body.token?.trim();

    if (!token) {
      return badRequest("token is required");
    }

    try {
      const redemption = await redeemInvitationToken(admin, user, token);
      return ok({ redeemed: true, ...redemption });
    } catch (error) {
      return serverError(error instanceof Error ? error.message : "Failed to redeem invitation token");
    }
  });