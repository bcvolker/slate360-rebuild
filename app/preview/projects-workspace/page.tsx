// Preview harness for the no-scroll project workspace shell (no login).
// Wraps it in an h-[100dvh] container to mimic the dashboard content's definite
// height, so we can verify the cover+tabs stay fixed and only the content scrolls.
import { ProjectDetailShell } from "@/components/projects/ProjectDetailShell";

export default function ProjectsWorkspacePreview() {
  return (
    <div className="h-[100dvh] bg-[var(--graphite-canvas)] p-4">
      <ProjectDetailShell
        projectId="demo"
        projectName="Oak Ridge Roof Inspection"
        status="active"
        locationLabel="1200 Oak Ridge Dr, Phoenix, AZ"
      >
        <div className="space-y-3">
          {Array.from({ length: 30 }, (_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-4 py-3 text-sm text-[var(--graphite-text-body)]"
            >
              Content row {i + 1}
            </div>
          ))}
        </div>
      </ProjectDetailShell>
    </div>
  );
}
