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
        <div className="font-semibold text-[var(--graphite-text-header)]">{form.name}</div>
        {form.projectType ? (
          <div className="mt-0.5 text-xs font-medium text-[var(--graphite-primary)]">{form.projectType}</div>
        ) : null}
        <dl className="mt-3 mb-4 space-y-1.5 text-sm">
          {form.client ? <SummaryRow label="Client" value={form.client} /> : null}
          {form.address ? <SummaryRow label="Site" value={form.address} /> : null}
          {form.startDate ? <SummaryRow label="Start" value={form.startDate} /> : null}
          {form.targetDate ? <SummaryRow label="Target" value={form.targetDate} /> : null}
          {form.squareFootage ? <SummaryRow label="Size" value={`${form.squareFootage} sq ft`} /> : null}
        </dl>
        {form.scope ? (
          <p className="mb-4 text-sm text-[var(--graphite-text-body)]">{form.scope}</p>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--graphite-muted)]">{label}</dt>
      <dd className="text-right text-[var(--graphite-text-body)]">{value}</dd>
    </div>
  );
}
