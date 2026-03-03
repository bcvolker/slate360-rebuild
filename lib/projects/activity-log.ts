import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type ProjectActivityInput = {
  projectId: string;
  orgId: string | null;
  actorId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function logProjectActivity(input: ProjectActivityInput): Promise<void> {
  const admin = createAdminClient();

  const payload = {
    org_id: input.orgId,
    project_id: input.projectId,
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  };

  const { error } = await admin.from("project_activity_log").insert(payload);

  if (error) {
    const message = String(error.message ?? "").toLowerCase();
    const tableMissing = message.includes("relation") && message.includes("project_activity_log");
    if (!tableMissing) {
      console.error("[project_activity_log] insert failed", error.message);
    }
  }
}
