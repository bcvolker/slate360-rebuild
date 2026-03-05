/**
 * StatusPill — canonical status badge.
 * Standardized color coding used across RFIs, Submittals, Punch List,
 * Budget, Schedule, and any future tool with a status field.
 *
 * Color contract (from design tokens):
 *   open      → blue
 *   in-review → amber/yellow
 *   approved  → green
 *   closed    → green
 *   overdue   → red
 *   draft     → gray
 */

interface StatusPillProps {
  status: string;
  /** Optional override label; defaults to capitalized status */
  label?: string;
  size?: "xs" | "sm";
}

const STATUS_STYLES: Record<string, string> = {
  open:        "bg-blue-50 text-blue-700 border-blue-100",
  "in-review": "bg-amber-50 text-amber-700 border-amber-100",
  "in_review": "bg-amber-50 text-amber-700 border-amber-100",
  pending:     "bg-amber-50 text-amber-700 border-amber-100",
  approved:    "bg-emerald-50 text-emerald-700 border-emerald-100",
  closed:      "bg-emerald-50 text-emerald-700 border-emerald-100",
  completed:   "bg-emerald-50 text-emerald-700 border-emerald-100",
  overdue:     "bg-red-50 text-red-700 border-red-100",
  rejected:    "bg-red-50 text-red-700 border-red-100",
  draft:       "bg-gray-100 text-gray-600 border-gray-200",
  active:      "bg-emerald-50 text-emerald-700 border-emerald-100",
  "on-hold":   "bg-amber-50 text-amber-700 border-amber-100",
  "on_hold":   "bg-amber-50 text-amber-700 border-amber-100",
  queued:      "bg-gray-100 text-gray-600 border-gray-200",
  processing:  "bg-blue-50 text-blue-700 border-blue-100",
  failed:      "bg-red-50 text-red-700 border-red-100",
};

export default function StatusPill({ status, label, size = "sm" }: StatusPillProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, "-");
  const styles = STATUS_STYLES[normalized] ?? "bg-gray-100 text-gray-600 border-gray-200";
  const displayLabel = label ?? status.replace(/-|_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={[
        "inline-flex items-center font-semibold rounded-full border",
        size === "xs" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5",
        styles,
      ].join(" ")}
    >
      {displayLabel}
    </span>
  );
}
