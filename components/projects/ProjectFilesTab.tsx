"use client";

import type { Tier } from "@/lib/entitlements";
import SlateDropClient from "@/components/slatedrop/SlateDropClient";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";

type ProjectFilesTabProps = {
  projectId: string;
  projectName: string;
  user: { name: string; email: string };
  tier: Tier;
};

export function ProjectFilesTab({ projectId, projectName, user, tier }: ProjectFilesTabProps) {
  return (
    <div className="space-y-4">
      <section className={t.sectionCard}>
        <p className={t.eyebrow}>Files</p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--graphite-text-header)]">
          Project SlateDrop folders
        </h2>
        <p className="mt-1 text-sm text-[var(--graphite-muted)]">
          Browse numbered project folders, upload plans and documents, and manage files for{" "}
          {projectName}.
        </p>
      </section>

      <div
        className="overflow-hidden rounded-2xl border border-[var(--mobile-app-card-border)]"
        style={{ height: "min(72vh, 720px)" }}
      >
        <SlateDropClient
          user={user}
          tier={tier}
          initialProjectId={projectId}
          projectName={projectName}
          embedded
        />
      </div>
    </div>
  );
}
