/* ── RFIs shared types, constants ───────────────────────────────── */

export type RFI = {
  id: string;
  subject: string;
  question: string;
  status: string;
  priority: string | null;
  assigned_to: string | null;
  ball_in_court: string | null;
  due_date: string | null;
  cost_impact: number | null;
  schedule_impact: number | null;
  distribution: string[];
  response_text: string | null;
  created_at: string;
  updated_at: string | null;
  closed_at: string | null;
};

export type RFIFormData = {
  subject: string;
  question: string;
  status: string;
  priority: string;
  assigned_to: string;
  ball_in_court: string;
  due_date: string;
  cost_impact: string;
  schedule_impact: string;
  response_text: string;
};

export const STATUSES = ["Open", "In Review", "Answered", "Closed"];
export const PRIORITIES = ["Low", "Normal", "High", "Urgent"];

export const STATUS_COLORS: Record<string, string> = {
  Open: "bg-red-500/20 text-red-400 border-red-500/30",
  "In Review": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Answered: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Closed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export const EMPTY_FORM: RFIFormData = {
  subject: "", question: "", status: "Open", priority: "Normal",
  assigned_to: "", ball_in_court: "", due_date: "",
  cost_impact: "0", schedule_impact: "0", response_text: "",
};
