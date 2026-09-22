import {
  CLIENT_CAPABILITY_IDS,
  PORTAL_CAPABILITY_IDS,
  isClientCapabilityId,
  type ClientCapabilityId,
} from "./capabilities";

export type CapabilityRow = {
  capabilityId: string;
  included: boolean;
};

export type ClientProjectScope = {
  /** True when this project has at least one stored capability row. */
  configured: boolean;
  included: ReadonlySet<ClientCapabilityId>;
};

/**
 * No stored rows yet.
 * Portal sections stay available so an existing project is not stripped of Items,
 * Documents, and History before the backfill runs.
 * Service capabilities stay off. A ready model or a thermal share does not turn
 * itself on.
 */
export function unconfiguredClientScope(): ClientProjectScope {
  return { configured: false, included: new Set(PORTAL_CAPABILITY_IDS) };
}

/** Stored rows win. A capability with no row, or included false, is not part of the project. */
export function resolveClientProjectScope(rows: readonly CapabilityRow[] | null | undefined): ClientProjectScope {
  const known = (rows ?? []).filter((row) => isClientCapabilityId(row.capabilityId));
  if (known.length === 0) return unconfiguredClientScope();
  const included = new Set<ClientCapabilityId>();
  for (const row of known) {
    if (row.included) included.add(row.capabilityId as ClientCapabilityId);
  }
  return { configured: true, included };
}

export function canClientSeeCapability(scope: ClientProjectScope, capability: ClientCapabilityId): boolean {
  return scope.included.has(capability);
}

export function scopeFromIncluded(ids: readonly ClientCapabilityId[]): ClientProjectScope {
  const rows = CLIENT_CAPABILITY_IDS.map((capabilityId) => ({
    capabilityId,
    included: ids.includes(capabilityId),
  }));
  return resolveClientProjectScope(rows);
}
