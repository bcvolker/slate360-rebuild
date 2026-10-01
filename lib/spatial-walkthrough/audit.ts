import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type WalkthroughAuditEvent =
  | "share_opened"
  | "access_code_success"
  | "access_code_failure"
  | "file_downloaded"
  | "share_revoked"
  | "export_generated";

export async function recordWalkthroughAudit(
  admin: SupabaseClient,
  args: {
    orgId: string;
    userId?: string | null;
    event: WalkthroughAuditEvent;
    walkthroughId: string;
    resourceId?: string | null;
    description?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await admin.from("org_usage_events").insert({
      org_id: args.orgId,
      user_id: args.userId ?? null,
      event_type: `spatial_walkthrough.${args.event}`,
      resource_type: "spatial_walkthrough",
      resource_id: args.resourceId ?? args.walkthroughId,
      resource_name: args.walkthroughId,
      description: args.description ?? args.event,
      metadata: { walkthroughId: args.walkthroughId, event: args.event, ...(args.metadata ?? {}) },
    });
  } catch {
    // audit is best-effort; never block viewing or export
  }
}
