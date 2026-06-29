/**
 * GET /api/site-walk/deliverables/[id]/source-items
 *
 * Returns the deliverable's source-walk items mapped to ViewerItem[] so the
 * desktop editor's source library can let a PM pull stops into the deliverable
 * (and auto-assemble). Mirrors the quick-deliverable mapping (viewerMediaType),
 * so what gets inserted renders identically in the /view/[token] share viewer.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import { viewerMediaType } from "@/lib/site-walk/deliverable-media";
import type { ViewerItem } from "@/lib/site-walk/viewer-types";

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data: del } = await admin
      .from("site_walk_deliverables")
      .select("session_id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!del) return notFound("Deliverable not found");
    if (!del.session_id) return ok({ items: [] });

    let q = admin
      .from("site_walk_items")
      .select("id, item_type, title, description, s3_key, created_at, metadata")
      .eq("session_id", del.session_id)
      .eq("org_id", orgId);
    q = excludeDeletedSiteWalkItems(q);

    const { data: rows, error } = await q
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) return serverError(error.message);

    const items: ViewerItem[] = (rows ?? []).map((r) => {
      const mediaType = viewerMediaType(r.item_type as string, r.s3_key as string | null);
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      const aiFormatted = meta.ai_formatted === true;
      const noteRaw = typeof meta.note_raw === "string" ? meta.note_raw : undefined;
      return {
        id: r.id as string,
        type: mediaType ?? "note",
        title: (r.title as string | null) || `(untitled ${r.item_type as string})`,
        mediaItemId: mediaType ? (r.id as string) : undefined,
        notes: (r.description as string | null) ?? undefined,
        // SW-014: surface AI-format provenance + the verbatim original so the
        // deliverable can disclose it and offer "view original".
        ...(aiFormatted ? { metadata: { ai_formatted: true, ...(noteRaw ? { note_raw: noteRaw } : {}) } } : {}),
      };
    });

    return ok({ items });
  });
