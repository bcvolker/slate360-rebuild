"use client";

import { ProjectDetailShell } from "@/components/projects/ProjectDetailShell";
import { ProjectPlansTab } from "@/components/projects/ProjectPlansTab";
import type { ProjectPlansTabData } from "@/lib/projects/plans-tab-data";

const MOCK: ProjectPlansTabData = {
  projectId: "preview",
  projectName: "Oak Ridge Roof Inspection",
  planSets: [
    { id: "1", title: "Architectural — A-Series", pageCount: 24, status: "ready", processingError: null, createdAt: "" },
    { id: "2", title: "Structural — S-Series", pageCount: 12, status: "processing", processingError: null, createdAt: "" },
    { id: "3", title: "MEP Rev B", pageCount: 8, status: "failed", processingError: "Sheet 3 could not be rasterized.", createdAt: "" },
  ],
};

export default function PreviewPlansTab() {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <ProjectDetailShell
        projectId="preview"
        projectName="Oak Ridge Roof Inspection"
        status="Active"
        locationLabel="1234 Oak Ridge Dr, Phoenix, AZ"
        showTwins
      >
        <ProjectPlansTab data={MOCK} canManage />
      </ProjectDetailShell>
    </div>
  );
}
