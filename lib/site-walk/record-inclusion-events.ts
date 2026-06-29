import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { recordEvidenceEvent } from "./evidence-events";
import type { ViewerItem } from "./viewer-types";

type RealItem = {
  id: string;
  metadata: Record<string, unknown> | null;
  capture_sha256: string | null;
};

/**
 * Chain-of-custody: when a deliverable is shared/published, record an
 * `included_in_deliverable` evidence event for each Site Walk item that appears
 * in the deliverable's content — proving exactly which captures went into the
 * delivered report, each linked into that item's per-entity hash chain.
 *
 * Idempotent: items that already carry an inclusion event for THIS deliverable
 * are skipped (single pre-query), so a `refresh: true` re-share only attests
 * newly-added items rather than re-emitting for the whole set. Best-effort and
 * **NON-FATAL** — never blocks sharing on chain-of-custody bookkeeping.
 *
 * Each event carries the item's capture hash (`capture_sha256`, falling back to
 * `metadata.content_sha256`) so a later Certified Evidence export can bundle
 * media + hash + chain without re-deriving it.
 */
export async function recordInclusionEvents(
  admin: SupabaseClient,
  params: {
    deliverableId: string;
    orgId: string;
    projectId: string | null;
    actorUserId: string;
    content: unknown;
    version: number | null;
  },
): Promise<void> {
  try {
    const blocks: ViewerItem[] = Array.isArray(params.content)
      ? (params.content as ViewerItem[])
      : [];

    // Each content block references a site_walk_item via mediaItemId (media) or id.
    const candidateIds = Array.from(
      new Set(
        blocks
          .map((b) => {
            if (b && typeof b.mediaItemId === "string" && b.mediaItemId) return b.mediaItemId;
            if (b && typeof b.id === "string" && b.id) return b.id;
            return null;
          })
          .filter((v): v is string => typeof v === "string" && v.length > 0),
      ),
    );
    if (candidateIds.length === 0) return;

    // Keep only IDs that are real items in this org; fetch each capture hash.
    const { data: items } = await admin
      .from("site_walk_items")
      .select("id, metadata, capture_sha256")
      .eq("org_id", params.orgId)
      .in("id", candidateIds);
    const realItems = (items ?? []) as RealItem[];
    if (realItems.length === 0) return;

    // One query: every item already attested as included in THIS deliverable.
    const { data: existing } = await admin
      .from("evidence_events")
      .select("entity_id")
      .eq("event_type", "included_in_deliverable")
      .eq("metadata->>deliverable_id", params.deliverableId);
    const already = new Set((existing ?? []).map((r) => (r as { entity_id: string }).entity_id));

    const toRecord = realItems.filter((it) => !already.has(it.id));
    if (toRecord.length === 0) return;

    // Each item is its own hash-chain entity, so the per-event SELECT+INSERT
    // pairs don't interfere — safe to run them concurrently.
    await Promise.all(
      toRecord.map((it) => {
        const metaHash =
          it.metadata && typeof it.metadata.content_sha256 === "string"
            ? (it.metadata.content_sha256 as string)
            : null;
        return recordEvidenceEvent({
          admin,
          orgId: params.orgId,
          projectId: params.projectId,
          entityType: "site_walk_item",
          entityId: it.id,
          eventType: "included_in_deliverable",
          actorUserId: params.actorUserId,
          contentSha256: it.capture_sha256 ?? metaHash,
          metadata: { deliverable_id: params.deliverableId, version: params.version },
        });
      }),
    );
  } catch {
    // Non-fatal — chain-of-custody bookkeeping must never break sharing.
  }
}
