/**
 * Client portal packaging: which deliverables were sold for a project, and how a
 * share may narrow them. Pure resolution lives here so it can be tested without a
 * database; loading lives in portal-package-load.ts.
 */

/**
 * Deliverables an operator can include today. `tour` joins with PR-C2 and `plan` once
 * the portal has a real plan viewer; both are already valid in the database.
 */
export const PACKAGE_DELIVERABLES = ["walkthrough", "stations", "twin", "evidence", "issues"] as const;
export type PackageDeliverable = (typeof PACKAGE_DELIVERABLES)[number] | "tour" | "plan";

export const DELIVERABLE_LABELS: Record<(typeof PACKAGE_DELIVERABLES)[number], string> = {
  walkthrough: "Walkthrough",
  stations: "360 stations",
  twin: "3D twin",
  evidence: "Documents",
  issues: "Items and questions",
};

export type PortalPackage = {
  deliverables: PackageDeliverable[];
  tourHistoryEnabled: boolean;
  currentVisitId: string | null;
};

const KNOWN = new Set<string>([...PACKAGE_DELIVERABLES, "tour", "plan"]);

export function normalizeDeliverables(input: unknown): PackageDeliverable[] {
  if (!Array.isArray(input)) return [];
  const out: PackageDeliverable[] = [];
  for (const v of input) {
    if (typeof v === "string" && KNOWN.has(v) && !out.includes(v as PackageDeliverable)) {
      out.push(v as PackageDeliverable);
    }
  }
  return out;
}

/**
 * What one share link may show. `enforced` false means packaging is off for the org
 * (legacy, data-driven tabs). When enforced, a missing package shows nothing, and a
 * share override can only remove deliverables, never add them.
 */
export function effectiveDeliverables(args: {
  enforced: boolean;
  pkg: PortalPackage | null;
  shareOverride: unknown;
}): Set<PackageDeliverable> | null {
  if (!args.enforced) return null;
  const base = args.pkg?.deliverables ?? [];
  if (args.shareOverride == null) return new Set(base);
  const narrowed = normalizeDeliverables(args.shareOverride);
  return new Set(base.filter((d) => narrowed.includes(d)));
}

export function isPackaged(allowed: Set<PackageDeliverable> | null, id: PackageDeliverable): boolean {
  return allowed == null || allowed.has(id);
}
