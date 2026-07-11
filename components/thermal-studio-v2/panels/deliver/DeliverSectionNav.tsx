export type DeliverSection = "share" | "reports" | "exports" | "qa" | "motion";

const SECTIONS: { id: DeliverSection; label: string }[] = [
  { id: "share", label: "Share link" },
  { id: "reports", label: "Report downloads" },
  { id: "exports", label: "Data exports" },
  { id: "qa", label: "Q&A inbox" },
  // S8-M (doc D4): deliberately last + plainly worded — few users need it.
  { id: "motion", label: "Motion" },
];

/** Left section nav (doc §1, Tab 5) — words, not icons alone. */
export function DeliverSectionNav({ active, onChange }: { active: DeliverSection; onChange: (s: DeliverSection) => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className={`rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors ${
            active === s.id
              ? "bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-text-header)]"
              : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          }`}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
