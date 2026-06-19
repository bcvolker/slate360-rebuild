// Preview harness for the project Deliverables tab (no login). Mock data.
import { ProjectDeliverablesTab } from "@/components/projects/ProjectDeliverablesTab";
import type { ProjectDeliverablesTabData } from "@/lib/projects/load-project-deliverables-data";

const MOCK: ProjectDeliverablesTabData = {
  projectId: "demo",
  deliverables: [
    { id: "d1", title: "Roof Inspection Report — Oct", deliverableType: "report", outputMode: "hosted", status: "shared", shareToken: "abc123abc123abc123", createdAt: new Date().toISOString() },
    { id: "d2", title: "Client Walkthrough Slideshow", deliverableType: "presentation", outputMode: "presentation", status: "published", shareToken: "def456def456def456", createdAt: new Date().toISOString() },
    { id: "d3", title: "Punch List Summary", deliverableType: "report", outputMode: "hosted", status: "draft", shareToken: null, createdAt: new Date().toISOString() },
  ],
};

export default function ProjectDeliverablesPreview() {
  return (
    <div className="min-h-screen bg-[var(--graphite-canvas)] p-4 lg:p-6">
      <ProjectDeliverablesTab data={MOCK} canManage />
    </div>
  );
}
