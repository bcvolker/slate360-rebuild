"use client";

import { Folder } from "lucide-react";
import {
  PROJECT_CREATE_FOLDER_PREVIEW,
  type ProjectCreateFormState,
} from "./project-create-constants";
import { ProjectCreateGlassCard } from "./ProjectCreateGlassCard";
import { projectCreateTokens } from "./project-create-tokens";

type Props = {
  form: ProjectCreateFormState;
  isSubmitting: boolean;
  onSubmit: () => void;
};

export function ProjectCreateStepConfirm({ form, isSubmitting, onSubmit }: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className={projectCreateTokens.sectionLabel}>Confirm & preview</div>

      <ProjectCreateGlassCard>
        <div className="mb-2 font-semibold text-[var(--graphite-text-header)]">{form.name}</div>
        {form.address ? (
          <div className="mb-4 text-sm text-[var(--graphite-muted)]">{form.address}</div>
        ) : null}
        {form.description ? (
          <p className="mb-4 text-sm text-[var(--graphite-text-body)]">{form.description}</p>
        ) : null}

        {form.invites.length > 0 ? (
          <div className="mb-4">
            <div className={`mb-2 ${projectCreateTokens.sectionLabel}`}>Invites</div>
            <p className="text-sm text-[var(--graphite-muted)]">{form.invites.join(", ")}</p>
          </div>
        ) : null}

        <div className={`mb-2 ${projectCreateTokens.sectionLabel}`}>Folders that will be created</div>
        <div className="space-y-1 pl-1 text-sm">
          {PROJECT_CREATE_FOLDER_PREVIEW.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center gap-2 text-[var(--graphite-muted)]"
            >
              <Folder className="h-4 w-4 shrink-0" aria-hidden />
              {folder.label}
            </div>
          ))}
        </div>
      </ProjectCreateGlassCard>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting || !form.name.trim()}
        className={projectCreateTokens.primaryButtonLg}
      >
        {isSubmitting ? "Creating project…" : "Create project"}
      </button>
    </div>
  );
}
