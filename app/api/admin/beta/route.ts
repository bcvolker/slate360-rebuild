/**
 * GET  /api/admin/beta — list profiles with beta status
 * PATCH /api/admin/beta — toggle is_beta_approved for a user
 *
 * Owner-only. Uses isOwnerEmail() fail-closed check.
 */
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { isOwnerEmail } from "@/lib/server/beta-access";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ user, admin }) => {
    if (!isOwnerEmail(user.email)) return forbidden();

    const { data, error } = await admin
      .from("profiles")
      .select("id, email, display_name, company, is_beta_approved, account_status, is_app_reviewer, created_at")
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ users: data ?? [] });
  });

export const PATCH = (req: NextRequest) =>
  withAuth(req, async ({ user, admin }) => {
    if (!isOwnerEmail(user.email)) return forbidden();

    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      approved?: boolean;
      isAppReviewer?: boolean;
    };

    if (!body.userId) {
      return badRequest("userId (string) is required");
    }

    // Build the update payload — at least one of approved/isAppReviewer must be provided
    type ProfileUpdate = {
      account_status?: string;
      is_beta_approved?: boolean;
      is_app_reviewer?: boolean;
      approved_at?: string | null;
    };
    const update: ProfileUpdate = {};

    if (typeof body.approved === "boolean") {
      update.account_status = body.approved ? "approved" : "pending_approval";
      update.is_beta_approved = body.approved;
      update.approved_at = body.approved ? new Date().toISOString() : null;
    }
    if (typeof body.isAppReviewer === "boolean") {
      update.is_app_reviewer = body.isAppReviewer;
    }

    if (Object.keys(update).length === 0) {
      return badRequest("approved (boolean) or isAppReviewer (boolean) is required");
    }

    const { data, error } = await admin
      .from("profiles")
      .update(update)
      .eq("id", body.userId)
      .select("id, email, display_name, is_beta_approved, account_status, is_app_reviewer")
      .single();

    if (error) return serverError(error.message);
    return ok({ user: data });
  });
