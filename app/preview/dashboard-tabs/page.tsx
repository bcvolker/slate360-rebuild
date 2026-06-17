// Preview harness for the redesigned dashboard domain workspaces (no login).
import { DashboardSiteWalksContent } from "@/components/dashboard-desktop/DashboardSiteWalksContent";
import { dashboardDesktopTokens as t } from "@/components/dashboard-desktop/dashboard-tokens";
import type { HubWalk } from "@/lib/types/site-walk";

const WALKS: HubWalk[] = Array.from({ length: 14 }, (_, i) => ({
  id: String(i),
  title: `Oak Ridge Walk ${i + 1}`,
  status: i % 3 === 0 ? "in_progress" : "completed",
  projectName: `Project ${1 + (i % 4)}`,
  updatedAt: new Date(Date.now() - 86400000 * i).toISOString(),
})) as unknown as HubWalk[];

export default function DashboardTabsPreview() {
  return (
    <div className={`min-h-screen ${t.canvas}`}>
      <main className={t.content}>
        <DashboardSiteWalksContent walks={WALKS} />
      </main>
    </div>
  );
}
