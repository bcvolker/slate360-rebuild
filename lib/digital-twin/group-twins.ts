import type { HubTwin } from "@/lib/types/digital-twin-hub";
import { isQuickScanPoolName } from "./quick-scan-title";

export type TwinProjectGroup = {
  key: string;
  projectName: string;
  filed: boolean;
  twins: HubTwin[];
};

export const UNFILED_LABEL = "Unfiled";

/**
 * Group twins (spaces) by job. Scans that landed in the "Quick Scans" pool are shown as
 * Unfiled — the pool is an operator convenience, not a client project — and sort last.
 */
export function groupTwinsByProject(twins: HubTwin[]): TwinProjectGroup[] {
  const order: string[] = [];
  const map = new Map<string, TwinProjectGroup>();
  for (const twin of twins) {
    const filed = Boolean(twin.projectId && twin.projectName) && !isQuickScanPoolName(twin.projectName);
    const key = filed ? twin.projectId! : "unfiled";
    const existing = map.get(key);
    if (existing) {
      existing.twins.push(twin);
      continue;
    }
    order.push(key);
    map.set(key, { key, projectName: filed ? twin.projectName! : UNFILED_LABEL, filed, twins: [twin] });
  }
  return order.map((key) => map.get(key)!).sort((a, b) => Number(b.filed) - Number(a.filed));
}
