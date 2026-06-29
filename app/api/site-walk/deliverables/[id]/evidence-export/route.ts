/**
 * GET /api/site-walk/deliverables/[id]/evidence-export
 *
 * Streams a **Certified Evidence export** ZIP for a deliverable: each included
 * item's original media (re-hashed at export), its append-only chain-of-custody
 * log, a MANIFEST.json, and a zero-dependency verifier. The capstone of the
 * evidentiary chain — a recipient or court can validate the bundle offline.
 */
import { NextRequest, NextResponse } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import { extractIncludedItemIds } from "@/lib/site-walk/included-items";
import { recordEvidenceEvent } from "@/lib/site-walk/evidence-events";
import {
  buildEvidenceExport,
  EvidenceExportTooLarge,
  type EvidenceDeliverableRow,
  type EvidenceItemRow,
} from "@/lib/site-walk/evidence-export";

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data: del } = await admin
      .from("site_walk_deliverables")
      .select("id, title, project_id, share_token, shared_at, content")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!del) return notFound("Deliverable not found");

    const ids = extractIncludedItemIds(del.content);
    if (ids.length === 0) return badRequest("Deliverable has no items to export");

    let q = admin
      .from("site_walk_items")
      .select(
        "id, item_type, title, description, s3_key, metadata, capture_sha256, server_sha256, hash_verified_at, capture_device_id, created_at",
      )
      .eq("org_id", orgId)
      .in("id", ids);
    q = excludeDeletedSiteWalkItems(q);
    const { data: items } = await q;
    if (!items || items.length === 0) return badRequest("No items found for this deliverable");

    const generatedAt = new Date().toISOString();
    let bytes: Uint8Array;
    try {
      bytes = await buildEvidenceExport(admin, {
        deliverable: del as unknown as EvidenceDeliverableRow,
        items: items as unknown as EvidenceItemRow[],
        orgId,
        userId: user.id,
        generatedAt,
      });
    } catch (e) {
      if (e instanceof EvidenceExportTooLarge) {
        return new NextResponse(
          "Evidence bundle is too large to export in a single request. Export fewer items or contact support.",
          { status: 413 },
        );
      }
      return serverError("Failed to build evidence export");
    }

    // Chain-of-custody: record that a certified export was generated (non-fatal).
    await recordEvidenceEvent({
      admin,
      orgId,
      projectId: (del.project_id as string | null) ?? null,
      entityType: "site_walk_deliverable",
      entityId: id,
      eventType: "evidence_exported",
      actorUserId: user.id,
      metadata: { item_count: items.length, generated_at: generatedAt },
    });

    const filename = `evidence-${id.slice(0, 8)}-${generatedAt.slice(0, 10)}.zip`;
    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(bytes.length),
      },
    });
  });
