import "server-only";

import { userCanManageVnextProject } from "@/lib/vnext/plans/manage-access";
import { CLIENT_CAPABILITY_IDS, isClientCapabilityId, type ClientCapabilityId } from "./capabilities";

type Admin = any;

export function normalizeIncludedIds(values: readonly string[]): ClientCapabilityId[] {
  const included = new Set<ClientCapabilityId>();
  for (const value of values) {
    if (isClientCapabilityId(value)) included.add(value);
  }
  return CLIENT_CAPABILITY_IDS.filter((id) => included.has(id));
}

/**
 * Replaces the project's delivery scope. Every known capability is stored, so a
 * project with services turned off is still configured and does not fall back
 * to the unconfigured portal default.
 */
export async function replaceProjectClientScope(
  admin: Admin,
  userId: string,
  projectId: string,
  projectOrgId: string | null,
  requested: readonly string[],
): Promise<"ok" | "denied" | "error"> {
  const allowed = await userCanManageVnextProject(admin, userId, projectId, projectOrgId);
  if (!allowed) return "denied";
  const included = new Set(normalizeIncludedIds(requested));
  const table = admin.from("project_client_capabilities");
  const removed = await table.delete().eq("project_id", projectId);
  if (removed.error) return "error";
  const inserted = await table.insert(
    CLIENT_CAPABILITY_IDS.map((capabilityId) => ({
      project_id: projectId,
      capability_id: capabilityId,
      included: included.has(capabilityId),
      updated_by: userId,
    })),
  );
  return inserted.error ? "error" : "ok";
}
