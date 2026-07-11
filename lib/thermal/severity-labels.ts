/** Universal severity words (doc §1b.4c) — never trade-specific, never amber. */
export function severityLabel(severity: string): "Critical" | "Warning" | "Advisory" {
  if (severity === "action") return "Critical";
  if (severity === "watch") return "Warning";
  return "Advisory";
}

export function severityRank(severity: string): number {
  if (severity === "action") return 0;
  if (severity === "watch") return 1;
  return 2;
}

export function severityChipClass(severity: string): string {
  if (severity === "action") return "bg-red-500/15 text-red-400 border-red-500/40";
  if (severity === "watch") return "bg-sky-400/15 text-sky-300 border-sky-400/40";
  return "bg-[color-mix(in_srgb,var(--graphite-muted)_20%,transparent)] text-[var(--graphite-muted)] border-[var(--mobile-app-card-border)]";
}
