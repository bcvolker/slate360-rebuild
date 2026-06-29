/**
 * POST /api/site-walk/deliverables/[id]/share — generate a share link
 *
 * Creates a unique share_token, freezes the deliverable's current content into
 * an immutable version snapshot, pins the link to that snapshot, and sets status
 * to "shared". Re-calling returns the existing token and keeps the pinned version
 * (immutable). Pass `refresh: true` to publish a new version onto the same link.
 * Supports optional expires_at and max_views.
 */
import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { createDeliverableSnapshot } from "@/lib/site-walk/deliverable-snapshots";
import { recordEvidenceEvent } from "@/lib/site-walk/evidence-events";
import { recordInclusionEvents } from "@/lib/site-walk/record-inclusion-events";
import type { IdRouteContext } from "@/lib/types/api";

type SharePayload = {
  expires_at?: string;
  max_views?: number;
  /** Re-freeze current content onto an already-shared link as a new version. */
  refresh?: boolean;
};

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as SharePayload;

    // Fetch current deliverable
    const { data: existing, error: fetchErr } = await admin
      .from("site_walk_deliverables")
      .select("id, share_token, status, share_revoked, project_id, content")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (fetchErr || !existing) return notFound("Deliverable not found");

    // Already shared and not revoked: keep the pinned version unless an explicit
    // refresh was requested (publish current content as a new version).
    if (existing.share_token && !existing.share_revoked && !body.refresh) {
      return ok({ share_token: existing.share_token });
    }

    const snapshot = await createDeliverableSnapshot(admin, {
      deliverableId: id,
      orgId,
      userId: user.id,
    });
    if (!snapshot) return serverError("Could not snapshot deliverable for sharing");

    if (existing.share_token && !existing.share_revoked && body.refresh) {
      // Same link, new version pinned.
      const { error: repinErr } = await admin
        .from("site_walk_deliverables")
        .update({ shared_snapshot_id: snapshot.id })
        .eq("id", id)
        .eq("org_id", orgId);
      if (repinErr) return serverError(repinErr.message);

      // Chain-of-custody: attest any newly-included items in this re-published version.
      await recordInclusionEvents(admin, {
        deliverableId: id,
        orgId,
        projectId: (existing.project_id as string | null) ?? null,
        actorUserId: user.id,
        content: existing.content,
        version: snapshot.version_number,
      });

      return ok({ share_token: existing.share_token, version: snapshot.version_number });
    }

    const token = randomBytes(24).toString("base64url");

    const { data, error } = await admin
      .from("site_walk_deliverables")
      .update({
        share_token: token,
        shared_at: new Date().toISOString(),
        status: "shared",
        share_revoked: false,
        share_view_count: 0,
        share_expires_at: body.expires_at ?? null,
        share_max_views: body.max_views ?? null,
        shared_snapshot_id: snapshot.id,
      })
      .eq("id", id)
      .eq("org_id", orgId)
      .select("id, share_token")
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Deliverable not found");

    // Chain-of-custody: record that the deliverable was shared (best-effort, non-fatal).
    await recordEvidenceEvent({
      admin,
      orgId,
      projectId: (existing.project_id as string | null) ?? null,
      entityType: "site_walk_deliverable",
      entityId: id,
      eventType: "deliverable_shared",
      actorUserId: user.id,
      metadata: { version: snapshot.version_number, expires_at: body.expires_at ?? null },
    });

    // Chain-of-custody: attest each captured item included in this delivered report.
    await recordInclusionEvents(admin, {
      deliverableId: id,
      orgId,
      projectId: (existing.project_id as string | null) ?? null,
      actorUserId: user.id,
      content: existing.content,
      version: snapshot.version_number,
    });

    return ok({ share_token: data.share_token, version: snapshot.version_number });
  });
