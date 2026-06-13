"use client";

import { useState } from "react";
import type { ProjectCreateFormState } from "./project-create-constants";
import { ProjectCreateGlassCard } from "./ProjectCreateGlassCard";
import { projectCreateTokens } from "./project-create-tokens";

type Props = {
  form: ProjectCreateFormState;
  onAddInvite: (email: string) => boolean;
  onRemoveInvite: (index: number) => void;
  onContinue: () => void;
};

export function ProjectCreateStepInvites({
  form,
  onAddInvite,
  onRemoveInvite,
  onContinue,
}: Props) {
  const [draftEmail, setDraftEmail] = useState("");

  const commitInvite = () => {
    if (!draftEmail.trim()) return;
    if (onAddInvite(draftEmail)) {
      setDraftEmail("");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className={projectCreateTokens.sectionLabel}>Invite team</div>

      <ProjectCreateGlassCard>
        {form.invites.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {form.invites.map((email, index) => (
              <div key={email} className={projectCreateTokens.inviteChip}>
                {email}
                <button
                  type="button"
                  onClick={() => onRemoveInvite(index)}
                  className="text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
                  aria-label={`Remove ${email}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-sm text-[var(--graphite-muted)]">
            Add teammates now or skip and invite later from the project.
          </p>
        )}

        <input
          type="email"
          placeholder="teammate@company.com"
          className={`${projectCreateTokens.fieldInput} ${projectCreateTokens.fieldBody}`}
          value={draftEmail}
          onChange={(event) => setDraftEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitInvite();
            }
          }}
        />
      </ProjectCreateGlassCard>

      <button type="button" onClick={onContinue} className={projectCreateTokens.primaryButton}>
        Continue
      </button>
    </div>
  );
}
