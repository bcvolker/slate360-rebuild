import { VnextProjectOverview } from "@/components/vnext/project/VnextProjectOverview";
import type { VnextProjectOverview as OverviewData } from "@/lib/vnext/overview-types";

export function VnextPublicOverview({ overview }: { overview: OverviewData }) {
  return <VnextProjectOverview overview={overview} />;
}
