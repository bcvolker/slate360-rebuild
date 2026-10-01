export type VnextProjectPlanSheet = {
  id: string;
  label: string;
  /** Set only when the sheet has a usable image. Processing and failed sheets stay null. */
  exploreHref: string | null;
  statusLabel: string | null;
};

export type VnextProjectPlanSource = {
  documentId: string;
  title: string;
  href: string;
};

export type VnextProjectPlanSet = {
  id: string;
  title: string;
  revisionLabel: string | null;
  source: VnextProjectPlanSource | null;
  sheets: VnextProjectPlanSheet[];
};

/**
 * A visit points at a project sheet. It does not own a copy of the plan.
 * History can later place two visits on the same planSheetId with different positions.
 * x/y are sheet percentages from site_walk_pins, not a drawing revision.
 */
export type VisitPlanAnchor = {
  sessionId: string;
  planSetId: string;
  planSheetId: string;
  xPct: number | null;
  yPct: number | null;
};
