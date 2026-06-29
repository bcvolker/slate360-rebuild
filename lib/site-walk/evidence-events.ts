import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type EvidenceEventInput = {
  admin: SupabaseClient;
  orgId: string;
  projectId?: string | null;
  entityType: string;
  entityId: string;
  eventType: string;
  actorUserId?: string | null;
  actorDeviceId?: string | null;
  contentSha256?: string | null;
  metadata?: Record<string, unknown>;
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Append a tamper-evident event to the chain-of-custody log (`evidence_events`),
 * linking each event to the previous one for the same entity via a hash chain.
 *
 * Best-effort and **NON-FATAL** — never blocks the caller, and silently no-ops if
 * the `evidence_events` table hasn't been migrated yet (so callers can be wired
 * before the migration is applied).
 */
export async function recordEvidenceEvent(input: EvidenceEventInput): Promise<void> {
  const { admin, orgId, entityType, entityId, eventType } = input;
  try {
    const { data: prev } = await admin
      .from("evidence_events")
      .select("event_hash")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle<{ event_hash: string }>();

    const prevHash = prev?.event_hash ?? null;
    const createdAt = new Date().toISOString();
    const canonical = JSON.stringify({
      prevHash,
      orgId,
      entityType,
      entityId,
      eventType,
      actorUserId: input.actorUserId ?? null,
      contentSha256: input.contentSha256 ?? null,
      metadata: input.metadata ?? {},
      createdAt,
    });
    const eventHash = await sha256Hex(canonical);

    await admin.from("evidence_events").insert({
      org_id: orgId,
      project_id: input.projectId ?? null,
      entity_type: entityType,
      entity_id: entityId,
      event_type: eventType,
      actor_user_id: input.actorUserId ?? null,
      actor_device_id: input.actorDeviceId ?? null,
      content_sha256: input.contentSha256 ?? null,
      prev_hash: prevHash,
      event_hash: eventHash,
      metadata: input.metadata ?? {},
      created_at: createdAt,
    });
  } catch {
    // Non-fatal — table may not be migrated yet, or a transient error.
  }
}
