"use client";

import { ProjectDetailShell } from "@/components/projects/ProjectDetailShell";

export default function PreviewProjectShell() {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <ProjectDetailShell
        projectId="preview"
        projectName="Oak Ridge Roof Inspection"
        status="Active"
        locationLabel="1234 Oak Ridge Dr, Phoenix, AZ"
        showTwins
        coverImageUrl="https://picsum.photos/seed/coverproj/1200/400"
      >
        <div className="rounded-2xl border border-[var(--mobile-app-card-border)] p-6 text-sm text-[var(--graphite-muted)]">
          Overview content goes here (cover, stats, recent activity).
        </div>
      </ProjectDetailShell>
    </div>
  );
}
