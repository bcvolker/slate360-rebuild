import "server-only";

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
 * Replaces the project's delivery scope in one database function.
 * All nine ids are upserted. Rows are not deleted first.
 * Only the operations owner may call this. Project member, manager, and
 * org-admin roles are not delivery authority.
 */
export async function replaceProjectClientScope(
  admin: Admin,
  userId: string,
  projectId: string,
  requested: readonly string[],
  canAccessOperationsConsole: boolean,
): Promise<"ok" | "denied" | "error"> {
  if (!canAccessOperationsConsole) return "denied";
  const { error } = await admin.rpc("replace_project_client_scope", {
    p_project_id: projectId,
    p_included: normalizeIncludedIds(requested),
    p_actor: userId,
  });
  if (!error) return "ok";
  if (error.code === "42501") return "denied";
  return "error";
}
