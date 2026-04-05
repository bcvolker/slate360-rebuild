/**
 * POST /api/apps/tour-builder/join
 * Claim a Tour Builder seat for the authenticated user's org.
 *
 * Calls the `increment_app_seat` Postgres function (+1) which handles
 * row-level locking and seat-limit enforcement.
 *
 * DELETE /api/apps/tour-builder/join
 * Release a Tour Builder seat (decrement). Soft-fails if already at 0.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError, unauthorized } from "@/lib/server/api-response";

export const runtime = "nodejs";

// POST — claim a seat
export const POST = (req: NextRequest) =>
  withAppAuth("tour_builder", req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("User has no organization");

    const { data, error } = await admin.rpc("increment_app_seat", {
      p_org_id: orgId,
      p_app_id: "tour_builder",
      p_delta: 1,
    });

    if (error) {
      // check_violation = seat limit exceeded
      if (error.code === "23514" || error.message?.includes("Seat limit exceeded")) {
        return badRequest("All Tour Builder seats are taken. Ask your admin to add more seats.");
      }
      console.error("[tour-builder/join] claim failed:", error.message);
      return serverError("Failed to claim seat");
    }

    console.log(`[tour-builder/join] user=${user.id} org=${orgId} seats_used=${data}`);
    return ok({ seats_used: data });
  });

// DELETE — release a seat
export const DELETE = (req: NextRequest) =>
  withAppAuth("tour_builder", req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("User has no organization");

    const { data, error } = await admin.rpc("increment_app_seat", {
      p_org_id: orgId,
      p_app_id: "tour_builder",
      p_delta: -1,
    });

    if (error) {
      console.error("[tour-builder/join] release failed:", error.message);
      return serverError("Failed to release seat");
    }

    console.log(`[tour-builder/join] released user=${user.id} org=${orgId} seats_used=${data}`);
    return ok({ seats_used: data });
  });
