"use client";

import type { ProjectCreateFormState } from "./project-create-constants";
import { ProjectCreateGlassCard } from "./ProjectCreateGlassCard";
import { projectCreateTokens } from "./project-create-tokens";

type Props = {
  form: ProjectCreateFormState;
  onChange: <K extends keyof ProjectCreateFormState>(
    key: K,
    value: ProjectCreateFormState[K],
  ) => void;
  onContinue: () => void;
};

export function ProjectCreateStepDetails({ form, onChange, onContinue }: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className={projectCreateTokens.sectionLabel}>Project details</div>

      <ProjectCreateGlassCard className="space-y-3">
        <input
          className={`${projectCreateTokens.fieldInput} ${projectCreateTokens.fieldTitle}`}
          placeholder="Project name"
          value={form.name}
          onChange={(event) => onChange("name", event.target.value)}
          autoFocus
        />
        <input
          className={`${projectCreateTokens.fieldInput} ${projectCreateTokens.fieldBody}`}
          placeholder="Site address"
          value={form.address}
          onChange={(event) => onChange("address", event.target.value)}
        />
        <textarea
          className={`${projectCreateTokens.fieldInput} ${projectCreateTokens.fieldBody} min-h-[80px] resize-y`}
          placeholder="Description (optional)"
          value={form.description}
          onChange={(event) => onChange("description", event.target.value)}
        />
      </ProjectCreateGlassCard>

      <button
        type="button"
        onClick={onContinue}
        disabled={!form.name.trim()}
        className={projectCreateTokens.primaryButton}
      >
        Continue
      </button>
    </div>
  );
}
