import "server-only";

import { isClientCapabilityId } from "./capabilities";
import { canClientSeeCapability, resolveClientProjectScope, unconfiguredClientScope, type ClientProjectScope } from "./resolve-client-scope";

type Admin = any;

function rows(data: unknown): Array<{ project_id?: string; capability_id?: string; included?: boolean }> {
  return Array.isArray(data) ? (data as Array<{ project_id?: string; capability_id?: string; included?: boolean }>) : [];
}

export async function readClientScopes(admin: Admin, projectIds: string[]): Promise<Map<string, ClientProjectScope>> {
  const scopes = new Map<string, ClientProjectScope>();
  if (projectIds.length === 0) return scopes;
  const result = await admin.from("project_client_capabilities").select("project_id, capability_id, included").in("project_id", projectIds);
  if (result.error) {
    for (const projectId of projectIds) scopes.set(projectId, unconfiguredClientScope());
    return scopes;
  }
  const grouped = new Map<string, Array<{ capabilityId: string; included: boolean }>>();
  for (const row of rows(result.data)) {
    const projectId = row.project_id;
    const capabilityId = row.capability_id;
    if (!projectId || !capabilityId || !isClientCapabilityId(capabilityId)) continue;
    const list = grouped.get(projectId) ?? [];
    list.push({ capabilityId, included: row.included === true });
    grouped.set(projectId, list);
  }
  for (const projectId of projectIds) {
    const stored = grouped.get(projectId);
    scopes.set(projectId, stored ? resolveClientProjectScope(stored) : unconfiguredClientScope());
  }
  return scopes;
}

export async function readClientScope(admin: Admin, projectId: string): Promise<ClientProjectScope> {
  const scopes = await readClientScopes(admin, [projectId]);
  return scopes.get(projectId) ?? unconfiguredClientScope();
}

export async function projectIncludesCapability(admin: Admin, projectId: string, capability: string): Promise<boolean> {
  if (!isClientCapabilityId(capability)) return false;
  const scope = await readClientScope(admin, projectId);
  return canClientSeeCapability(scope, capability);
}
