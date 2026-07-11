import { describeAnomaly, type DescribeOptions, type ThermalAnomaly } from "@/lib/thermal/anomaly-describe";

export type FindingsReviewMeta =
  | {
      accepted?: string[];
      dismissed?: string[];
      edits?: Record<string, string>;
    }
  | null
  | undefined;

export type ReviewedFinding = {
  anomaly: ThermalAnomaly;
  /** Original index into the capture's raw `anomalies` array — the key `findings_review` uses. */
  index: number;
  /** What should actually render: the operator's edit, else the AI's scene-aware observation, else the generic template sentence. */
  text: string;
  reviewed: boolean;
};

/**
 * Audit remediation Batch 2 (docs/design/THERMAL_V2_AUDIT_REMEDIATION_LOCKED.md
 * §3): the ONE place "what should actually render for this capture's findings"
 * is decided — filters dismissed anomalies out entirely and prefers the
 * operator's edited text over the AI's. Shared by the Report preview and (via
 * an identical Python port, since the worker can't share this module) the PDF
 * and HTML renderers, so a deliverable can never disagree with what the
 * operator actually reviewed in AI Review (S6).
 */
export function projectReviewedFindings(
  anomalies: ThermalAnomaly[] | null | undefined,
  review: FindingsReviewMeta,
  opts: DescribeOptions = {},
): ReviewedFinding[] {
  const list = anomalies ?? [];
  const dismissed = new Set(review?.dismissed ?? []);
  const edits = review?.edits ?? {};
  const accepted = new Set(review?.accepted ?? []);

  const kept: ReviewedFinding[] = [];
  list.forEach((anomaly, index) => {
    if (dismissed.has(String(index))) return;
    const editText = edits[String(index)];
    const text = editText || anomaly.observation || describeAnomaly(anomaly, opts);
    kept.push({ anomaly, index, text, reviewed: accepted.has(String(index)) || Boolean(editText) });
  });
  return kept;
}
