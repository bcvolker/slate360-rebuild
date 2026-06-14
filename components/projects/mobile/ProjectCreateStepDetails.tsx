"use client";

import {
  PROJECT_TYPE_OPTIONS,
  type ProjectCreateFormState,
} from "./project-create-constants";
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

const fieldLabel = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--graphite-muted)]";
const boxedInput =
  "w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-3 py-2.5 text-sm text-[var(--graphite-text-body)] placeholder:text-[var(--graphite-muted)] outline-none focus:border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)]";

export function ProjectCreateStepDetails({ form, onChange, onContinue }: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <ProjectCreateGlassCard className="space-y-3">
          <input
            className={`${projectCreateTokens.fieldInput} ${projectCreateTokens.fieldTitle}`}
            placeholder="Project name"
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            autoFocus
          />
          <div>
            <label className={fieldLabel}>Project type</label>
            <select
              className={boxedInput}
              value={form.projectType}
              onChange={(event) => onChange("projectType", event.target.value)}
            >
              <option value="">Select type…</option>
              {PROJECT_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabel}>Scope / description</label>
            <textarea
              className={`${boxedInput} min-h-[80px] resize-y`}
              placeholder="What's being built or inspected, and why."
              value={form.scope}
              onChange={(event) => onChange("scope", event.target.value)}
            />
          </div>
        </ProjectCreateGlassCard>
      </div>

      <div>
        <ProjectCreateGlassCard className="space-y-3">
          <div>
            <label className={fieldLabel}>Client / owner</label>
            <input
              className={boxedInput}
              placeholder="e.g. Oak Ridge Properties"
              value={form.client}
              onChange={(event) => onChange("client", event.target.value)}
            />
          </div>
          <div>
            <label className={fieldLabel}>Site address</label>
            <input
              className={boxedInput}
              placeholder="Street, city, state"
              value={form.address}
              onChange={(event) => onChange("address", event.target.value)}
            />
            <p className="mt-1 text-[11px] text-[var(--graphite-muted)]">
              Map-pick &amp; address autofill coming next — this seeds the project location.
            </p>
          </div>
        </ProjectCreateGlassCard>
      </div>

      <div>
        <ProjectCreateGlassCard className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>Start date</label>
            <input
              type="date"
              className={boxedInput}
              value={form.startDate}
              onChange={(event) => onChange("startDate", event.target.value)}
            />
          </div>
          <div>
            <label className={fieldLabel}>Target completion</label>
            <input
              type="date"
              className={boxedInput}
              value={form.targetDate}
              onChange={(event) => onChange("targetDate", event.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className={fieldLabel}>Approx. size (sq ft, optional)</label>
            <input
              inputMode="numeric"
              className={boxedInput}
              placeholder="e.g. 24,000"
              value={form.squareFootage}
              onChange={(event) => onChange("squareFootage", event.target.value)}
            />
          </div>
        </ProjectCreateGlassCard>
      </div>

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
