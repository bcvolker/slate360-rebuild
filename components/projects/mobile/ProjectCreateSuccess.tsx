"use client";

import Link from "next/link";
import { CheckCircle2, FolderKanban } from "lucide-react";
import { ProjectCreateGlassCard } from "./ProjectCreateGlassCard";
import { projectCreateTokens } from "./project-create-tokens";

type Props = {
  projectId: string;
  projectName: string;
  inviteWarnings: string[];
};

export function ProjectCreateSuccess({ projectId, projectName, inviteWarnings }: Props) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-10 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-primary)]">
        <CheckCircle2 className="h-8 w-8" aria-hidden />
      </span>

      <h1 className="text-xl font-bold text-[var(--graphite-text-header)]">Project created</h1>
      <p className="mt-2 text-sm text-[var(--graphite-muted)]">
        <span className="font-medium text-[var(--graphite-text-body)]">{projectName}</span> is ready.
        SlateDrop folders and your project workspace are provisioned.
      </p>

      {inviteWarnings.length > 0 ? (
        <ProjectCreateGlassCard className="mt-6 w-full text-left">
          <p className="mb-2 text-sm font-medium text-[var(--graphite-text-header)]">
            Some invites could not be sent
          </p>
          <ul className="space-y-1 text-xs text-[var(--graphite-muted)]">
            {inviteWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </ProjectCreateGlassCard>
      ) : null}

      <div className="mt-8 flex w-full flex-col gap-3">
        <Link href={`/projects/${projectId}`} className={projectCreateTokens.primaryButtonLg}>
          Open project
        </Link>
        <Link
          href="/projects"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3.5 text-sm font-medium text-[var(--graphite-text-body)] transition hover:bg-white/[0.04]"
        >
          <FolderKanban className="h-4 w-4" aria-hidden />
          Back to projects
        </Link>
      </div>
    </div>
  );
}
