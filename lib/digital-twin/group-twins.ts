import type { HubTwin } from "@/lib/types/digital-twin-hub";

export type TwinProjectGroup = {
  key: string;
  projectName: string;
  filed: boolean;
  twins: HubTwin[];
};

export function groupTwinsByProject(twins: HubTwin[]): TwinProjectGroup[] {
  const order: string[] = [];
  const map = new Map<string, TwinProjectGroup>();
  for (const twin of twins) {
    const filed = Boolean(twin.projectId && twin.projectName);
    const key = filed ? twin.projectId! : "unfiled";
    const existing = map.get(key);
    if (existing) {
      existing.twins.push(twin);
      continue;
    }
    order.push(key);
    map.set(key, {
      key,
      projectName: filed ? twin.projectName! : "Unfiled",
      filed,
      twins: [twin],
    });
  }
  return order
    .map((key) => map.get(key)!)
    .sort((a, b) => Number(b.filed) - Number(a.filed));
}
