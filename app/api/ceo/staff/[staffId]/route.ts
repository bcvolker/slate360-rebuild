import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, forbidden, badRequest, serverError, notFound } from "@/lib/server/api-response";

/**
 * CEO Staff — per-member operations
 * PATCH  — update access scope, display name, notes
 * DELETE — revoke access (soft-delete via revoked_at)
 */

function isCeo(email: string | undefined): boolean {
  return email === "slate360ceo@gmail.com";
}

function sanitizeAccessScope(value: unknown): string[] {
  const validScopes = new Set(["ceo", "market", "athlete360"]);
  if (!Array.isArray(value)) return [];
  return value.filter((scope): scope is string => typeof scope === "string" && validScopes.has(scope));
}

type RouteContext = { params: Promise<{ staffId: string }> };

export const PATCH = (req: NextRequest, ctx: RouteContext) =>
  withAuth(req, async ({ user, admin }) => {
    if (!isCeo(user.email)) return forbidden("CEO access required");

    const { staffId } = await ctx.params;
    if (!staffId) return badRequest("Staff ID required");

    const body = await req.json() as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if (typeof body.displayName === "string") updates.display_name = body.displayName.trim();
    if (Array.isArray(body.accessScope)) {
      const accessScope = sanitizeAccessScope(body.accessScope);
      if (accessScope.length === 0) return badRequest("At least one valid access scope is required");
      updates.access_scope = accessScope;
    }
    if (typeof body.notes === "string") updates.notes = body.notes.trim();

    if (Object.keys(updates).length === 0) return badRequest("No fields to update");

    const { error } = await admin
      .from("slate360_staff")
      .update(updates)
      .eq("id", staffId);

    if (error) return serverError(error.message);
    return ok({ updated: true });
  });

export const DELETE = (req: NextRequest, ctx: RouteContext) =>
  withAuth(req, async ({ user, admin }) => {
    if (!isCeo(user.email)) return forbidden("CEO access required");

    const { staffId } = await ctx.params;
    if (!staffId) return badRequest("Staff ID required");

    // Verify the record exists and is active
    const { data: existing } = await admin
      .from("slate360_staff")
      .select("id, revoked_at")
      .eq("id", staffId)
      .maybeSingle();

    if (!existing) return notFound("Staff member not found");
    if (existing.revoked_at) return badRequest("Already revoked");

    // Soft-revoke: set revoked_at
    const { error } = await admin
      .from("slate360_staff")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", staffId);

    if (error) return serverError(error.message);
    return ok({ revoked: true });
  });
