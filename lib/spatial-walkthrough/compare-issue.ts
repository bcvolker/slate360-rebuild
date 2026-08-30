import { parseCompareLocator, type CompareLocator } from "./compare-locator";

export const COMPARE_VERIFICATIONS = ["before", "after", "verified"] as const;
export type CompareVerification = (typeof COMPARE_VERIFICATIONS)[number];

export type CompareIssueRef = {
  id: string;
  projectId: string;
  pinId: string | null;
  projectItemId: string | null;
  title: string;
  beforeLocator: CompareLocator;
  afterLocator: CompareLocator;
  verification: CompareVerification;
};

export function parseVerification(value: unknown): CompareVerification {
  const v = String(value ?? "before");
  return COMPARE_VERIFICATIONS.includes(v as CompareVerification) ? (v as CompareVerification) : "before";
}

export function nextVerification(current: CompareVerification): CompareVerification {
  if (current === "before") return "after";
  if (current === "after") return "verified";
  return "verified";
}

export function toCompareIssueRef(row: Record<string, unknown>): CompareIssueRef | null {
  const beforeLocator = parseCompareLocator(row.before_locator ?? row.beforeLocator);
  const afterLocator = parseCompareLocator(row.after_locator ?? row.afterLocator);
  if (!beforeLocator || !afterLocator) return null;
  return {
    id: String(row.id),
    projectId: String(row.project_id ?? row.projectId ?? ""),
    pinId: typeof row.pin_id === "string" ? row.pin_id : typeof row.pinId === "string" ? row.pinId : null,
    projectItemId: typeof row.project_item_id === "string"
      ? row.project_item_id
      : typeof row.projectItemId === "string" ? row.projectItemId : null,
    title: String(row.title ?? "Issue"),
    beforeLocator,
    afterLocator,
    verification: parseVerification(row.verification),
  };
}
