// Preview harness for the project Overview tab (no login). Mock data only.
import { ProjectOverviewTab } from "@/components/projects/ProjectOverviewTab";
import type { ProjectOverviewData } from "@/lib/projects/load-project-overview-data";

const MOCK: ProjectOverviewData = {
  projectId: "demo",
  name: "Oak Ridge Roof Inspection",
  status: "Active",
  locationLabel: "Oak Ridge",
  description: "Annual roof + envelope inspection for the Oak Ridge commercial complex.",
  startDate: new Date().toISOString(),
  endDate: null,
  counts: { walks: 6, twins: 2, files: 41, deliverables: 2, teamMembers: 4, walkthroughs: 3 },
  lastFileUploadAt: new Date().toISOString(),
  showTwins: true,
  showSiteWalk: true,
  showWalkthroughs: true,
  spatialOnly: false,
  latestWalkthrough: null,
  recentWalkthroughs: [],
  recentFiles: [],
  recentPins: [],
  recentActivity: Array.from({ length: 8 }, (_, i) => ({
    id: String(i),
    kind: "walk" as const,
    title: `Walk ${i + 1} captured`,
    meta: "Site Walk",
    occurredAt: new Date(Date.now() - 86400000 * i).toISOString(),
    href: "#",
  })),
};

export default function ProjectOverviewPreview() {
  return (
    <div className="min-h-screen bg-[var(--graphite-canvas)] p-4 lg:p-6">
      <ProjectOverviewTab data={MOCK} />
    </div>
  );
}
