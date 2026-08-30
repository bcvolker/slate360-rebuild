import { parseCompareLocator, type CompareLocator } from "./compare-locator";

export type CompareAnchor = {
  id: string;
  projectId: string;
  label: string | null;
  beforeWalkthroughId: string;
  afterWalkthroughId: string;
  before: CompareLocator;
  after: CompareLocator;
  createdAt: string;
};

export function toCompareAnchor(row: Record<string, unknown>): CompareAnchor | null {
  const before = parseCompareLocator(row.before_locator ?? row.before);
  const after = parseCompareLocator(row.after_locator ?? row.after);
  if (!before || !after) return null;
  return {
    id: String(row.id),
    projectId: String(row.project_id ?? row.projectId ?? ""),
    label: typeof row.label === "string" && row.label.trim() ? row.label : null,
    beforeWalkthroughId: String(row.before_walkthrough_id ?? row.beforeWalkthroughId ?? before.walkthroughId),
    afterWalkthroughId: String(row.after_walkthrough_id ?? row.afterWalkthroughId ?? after.walkthroughId),
    before,
    after,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
  };
}

export function anchorsForPair(
  anchors: CompareAnchor[],
  beforeWalkthroughId: string,
  afterWalkthroughId: string,
): CompareAnchor[] {
  return anchors
    .filter((a) => a.beforeWalkthroughId === beforeWalkthroughId && a.afterWalkthroughId === afterWalkthroughId)
    .slice()
    .sort((a, b) => a.before.tSeconds - b.before.tSeconds);
}
