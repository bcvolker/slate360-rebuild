"use client";

import type { CompareIssueRef, CompareVerification } from "@/lib/spatial-walkthrough/compare-issue";

const STEPS: CompareVerification[] = ["before", "after", "verified"];

type Props = {
  issues: CompareIssueRef[];
  onSelect: (id: string, step: CompareVerification) => void;
};

export function CompareIssueBar({ issues, onSelect }: Props) {
  const issue = issues[0];
  if (!issue) return null;
  return (
    <section className="sw-compare-issue" aria-label="Issue locators">
      <p className="sw-compare-kicker">{issue.title}</p>
      <p className="sw-compare-note">Pin / Project Item locators: before and after. Verification is fixture-only here.</p>
      <div className="sw-compare-modes">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            aria-pressed={issue.verification === step}
            onClick={() => onSelect(issue.id, step)}
          >
            {step === "before" ? "Before" : step === "after" ? "After" : "Verified"}
          </button>
        ))}
      </div>
    </section>
  );
}
