/** Site Walk v2 capture classifications — trade-neutral, field-ready. */
export const CAPTURE_CLASSIFICATIONS = [
  "Safety",
  "Progress",
  "Issue",
  "Quality",
  "Other",
] as const;

export type CaptureClassification = (typeof CAPTURE_CLASSIFICATIONS)[number];
export type MarkupTool = "pin" | "rect" | "arrow";

export type CaptureStopSummary = {
  id: string;
  label: string;
  complete: boolean;
};

export type CaptureFlowClientProps = {
  sessionId: string;
  /** Required for SlateDrop file picker — pass session.project_id from the server page. */
  projectId?: string | null;
  stopIndex?: number;
  stopLabel?: string;
  stops?: CaptureStopSummary[];
  initialNotes?: string;
  initialClassification?: CaptureClassification | null;
  photoPreviewUrl?: string | null;
};
