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
      .select("id, email, display_name, company, is_beta_approved, created_at")
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
    };

    if (!body.userId || typeof body.approved !== "boolean") {
      return badRequest("userId (string) and approved (boolean) are required");
    }

    const { data, error } = await admin
      .from("profiles")
      .update({ is_beta_approved: body.approved })
      .eq("id", body.userId)
      .select("id, email, display_name, is_beta_approved")
      .single();

    if (error) return serverError(error.message);
    return ok({ user: data });
  });
