/* Schedule page shared types, constants & helpers */

export type TaskRow = {
  id: string; name: string; start_date: string | null; end_date: string | null;
  status: string; percent_complete: number; assigned_to: string | null;
  priority: string; notes: string | null; is_milestone: boolean;
  created_at: string; updated_at: string | null;
};

export type ScheduleFormData = {
  name: string; startDate: string; endDate: string; status: string;
  percentComplete: string; assignedTo: string; priority: string;
  notes: string; isMilestone: boolean;
};

export const STATUSES = ["Not Started", "In Progress", "Completed", "On Hold", "Delayed"];
export const PRIORITIES = ["Low", "Normal", "High", "Critical"];

export const STATUS_COLORS: Record<string, { bar: string; badge: string }> = {
  "Not Started": { bar: "bg-zinc-500",    badge: "bg-card text-zinc-300 border-zinc-700" },
  "In Progress": { bar: "bg-blue-500",    badge: "bg-blue-950/40 text-blue-400 border-blue-900/50" },
  Completed:     { bar: "bg-emerald-500", badge: "bg-emerald-950/40 text-emerald-400 border-emerald-900/50" },
  "On Hold":     { bar: "bg-amber-400",   badge: "bg-amber-950/40 text-amber-400 border-amber-900/50" },
  Delayed:       { bar: "bg-red-500",     badge: "bg-red-950/40 text-red-400 border-red-900/50" },
};

export const PRIORITY_DOT: Record<string, string> = {
  Low: "bg-zinc-500", Normal: "bg-blue-400", High: "bg-amber-400", Critical: "bg-red-500",
};

export const EMPTY_FORM: ScheduleFormData = {
  name: "", startDate: "", endDate: "", status: "Not Started",
  percentComplete: "0", assignedTo: "", priority: "Normal", notes: "", isMilestone: false,
};

export const MS_DAY = 86_400_000;
export const TASK_ROW_H = 40;
export const LEFT_W = 240;

export function addDays(ms: number, n: number) { return new Date(ms + n * MS_DAY); }
export function fmtYMD(d: Date) { return d.toISOString().slice(0, 10); }
