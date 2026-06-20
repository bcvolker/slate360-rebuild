/**
 * POST /api/site-walk/sessions/bulk-delete
 *
 * Bulk-clear test walks from the app (no more one-at-a-time name-match
 * confirmations). Org-scoped via withAppAuth + .eq("org_id", orgId).
 *
 * Body:
 *   {
 *     ids: string[],                 // session ids to remove
 *     mode?: "archive" | "permanent" // default "permanent"
 *   }
 *
 * "archive" sets status='archived' (reversible). "permanent" deletes the
 * session rows and their children. Child cleanup tolerates schema drift so a
 * missing column/table never aborts the batch.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

const SESSION_CHILD_TABLES = [
  "site_walk_items",
  "site_walk_pins",
  "site_walk_plans",
  "site_walk_comments",
  "site_walk_deliverables",
] as const;

export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json().catch(() => ({}))) as {
      ids?: unknown;
      mode?: unknown;
    };

    const ids = Array.isArray(body.ids)
      ? body.ids.filter((v): v is string => typeof v === "string" && v.length > 0)
      : [];
    if (ids.length === 0) return badRequest("ids must be a non-empty array of session ids");
    if (ids.length > 500) return badRequest("Refusing to delete more than 500 walks in one call");

    const mode = body.mode === "archive" ? "archive" : "permanent";

    // Only operate on sessions that actually belong to this org.
    const { data: owned, error: ownErr } = await admin
      .from("site_walk_sessions")
      .select("id")
      .eq("org_id", orgId)
      .in("id", ids);
    if (ownErr) return serverError(ownErr.message);

    const ownedIds = (owned ?? []).map((r) => r.id);
    if (ownedIds.length === 0) return ok({ archived: 0, deleted: 0, skipped: ids.length });

    if (mode === "archive") {
      const { error } = await admin
        .from("site_walk_sessions")
        .update({ status: "archived" })
        .eq("org_id", orgId)
        .in("id", ownedIds);
      if (error) return serverError(error.message);
      return ok({ archived: ownedIds.length, skipped: ids.length - ownedIds.length });
    }

    // Permanent: clear children first (org-scoped where the column exists), then sessions.
    for (const table of SESSION_CHILD_TABLES) {
      const { error } = await admin.from(table).delete().in("session_id", ownedIds);
      if (error) {
        // Tolerate tables that lack session_id / don't exist.
        console.warn(`[bulk-delete] skip ${table}: ${error.message}`);
      }
    }

    const { error: delErr } = await admin
      .from("site_walk_sessions")
      .delete()
      .eq("org_id", orgId)
      .in("id", ownedIds);
    if (delErr) return serverError(delErr.message);

    return ok({ deleted: ownedIds.length, skipped: ids.length - ownedIds.length });
  });
