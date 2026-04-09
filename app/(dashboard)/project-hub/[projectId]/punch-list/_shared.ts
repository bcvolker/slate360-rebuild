export type PunchItem = {
  id: string; number: number; title: string; description: string | null;
  status: "Open" | "In Progress" | "Ready for Review" | "Closed";
  priority: "Low" | "Medium" | "High" | "Critical";
  assignee: string | null; location_area: string | null; trade_category: string | null;
  due_date: string | null; photos: string[];
  created_at: string; updated_at: string; completed_at: string | null;
};

export type PunchFormData = {
  title: string; description: string; status: PunchItem["status"];
  priority: PunchItem["priority"]; assignee: string; location_area: string;
  trade_category: string; due_date: string;
};

export const STATUSES: PunchItem["status"][] = ["Open", "In Progress", "Ready for Review", "Closed"];
export const PRIORITIES: PunchItem["priority"][] = ["Low", "Medium", "High", "Critical"];
export const TRADES = [
  "General", "Electrical", "Plumbing", "HVAC", "Painting", "Flooring",
  "Drywall", "Roofing", "Landscaping", "Fire Protection", "Concrete", "Steel",
];

export const STATUS_COLORS: Record<string, string> = {
  Open: "bg-red-500/20 text-red-400 border-red-500/30",
  "In Progress": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Ready for Review": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Closed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-zinc-700 text-zinc-400",
  Medium: "bg-blue-500/20 text-blue-400",
  High: "bg-amber-500/20 text-orange-400",
  Critical: "bg-red-500/20 text-red-400",
};

export const EMPTY_FORM: PunchFormData = {
  title: "", description: "", status: "Open", priority: "Medium",
  assignee: "", location_area: "", trade_category: "", due_date: "",
};
