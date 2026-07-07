/** S1 scaffold filler — replaced with real content slice-by-slice (S2+). */
export function PlaceholderZone({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="flex h-full min-h-[80px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--mobile-app-card-border)] p-4 text-center">
      <span className="text-xs font-semibold text-[var(--graphite-text-header)]">{label}</span>
      {detail ? <span className="text-[11px] text-[var(--graphite-muted)]">{detail}</span> : null}
    </div>
  );
}
