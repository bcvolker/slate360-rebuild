import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, forbidden, serverError, badRequest } from "@/lib/server/api-response";

/**
 * CEO Staff Management API
 * GET  — list all staff grants (active + revoked)
 * POST — grant access to a new staff email
 *
 * Only accessible by slate360ceo@gmail.com (the CEO). 
 * Uses admin client to bypass RLS on slate360_staff table.
 */

function isCeo(email: string | undefined): boolean {
  return email === "slate360ceo@gmail.com";
}

function sanitizeAccessScope(value: unknown): string[] {
  const validScopes = new Set(["market", "athlete360"]);
  if (!Array.isArray(value)) return ["market"];

  const sanitized = value.filter((scope): scope is string => typeof scope === "string" && validScopes.has(scope));
  return sanitized.length > 0 ? sanitized : ["market"];
}

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ user, admin }) => {
    if (!isCeo(user.email)) return forbidden("CEO access required");

    const { data, error } = await admin
      .from("slate360_staff")
      .select("id, email, display_name, granted_by, granted_at, revoked_at, access_scope, notes")
      .order("granted_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ staff: data ?? [] });
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin }) => {
    if (!isCeo(user.email)) return forbidden("CEO access required");

    const body = await req.json() as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : null;
    const accessScope = sanitizeAccessScope(body.accessScope);
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;

    if (!email || !email.includes("@")) return badRequest("Valid email required");

    // Check if already exists (including revoked)
    const { data: existing } = await admin
      .from("slate360_staff")
      .select("id, revoked_at")
      .eq("email", email)
      .maybeSingle();

    if (existing && !existing.revoked_at) {
      return badRequest("This email already has active staff access");
    }

    // If previously revoked, re-activate
    if (existing?.revoked_at) {
      const { error } = await admin
        .from("slate360_staff")
        .update({
          revoked_at: null,
          granted_by: user.email,
          granted_at: new Date().toISOString(),
          display_name: displayName,
          access_scope: accessScope,
          notes,
        })
        .eq("id", existing.id);

      if (error) return serverError(error.message);
      return ok({ granted: true, reactivated: true });
    }

    // New grant
    const { error } = await admin.from("slate360_staff").insert({
      email,
      display_name: displayName,
      granted_by: user.email,
      access_scope: accessScope,
      notes,
    });

    if (error) return serverError(error.message);
    return ok({ granted: true, reactivated: false });
  });
