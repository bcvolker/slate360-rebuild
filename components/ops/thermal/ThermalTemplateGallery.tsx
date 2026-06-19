"use client";

export type GalleryTemplate = {
  id: string;
  name: string;
  discipline?: string;
  standards?: string[];
  sections?: Record<string, boolean>;
};

const DISCIPLINE_LABEL: Record<string, string> = {
  roof: "Roof / Envelope",
  electrical: "Electrical",
  mechanical: "Mechanical",
  general: "General",
  forensic: "Forensic",
};

// Tiny layout glyph hinting at the report's emphasis — no images, pure tokens.
function SectionPreview({ sections }: { sections?: Record<string, boolean> }) {
  const rows = [
    ["executive_summary", "Summary"],
    ["findings", "Findings"],
    ["severity_table", "Severity"],
    ["methodology", "Methodology"],
  ] as const;
  return (
    <div className="mt-2 space-y-1">
      {rows.map(([key, label]) => {
        const on = sections ? sections[key] !== false : true;
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-6 rounded-full ${
                on ? "bg-[var(--graphite-primary)]" : "bg-[color-mix(in_srgb,var(--graphite-muted)_30%,transparent)]"
              }`}
            />
            <span className={`text-[9px] ${on ? "text-[var(--graphite-text-body)]" : "text-[var(--graphite-muted)] line-through"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Visual report-template picker — selectable preview cards (replaces a <select>). */
export function ThermalTemplateGallery({
  templates,
  selectedId,
  onSelect,
}: {
  templates: GalleryTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {templates.map((tpl) => {
        const active = tpl.id === selectedId;
        return (
          <li key={tpl.id}>
            <button
              type="button"
              onClick={() => onSelect(tpl.id)}
              aria-pressed={active}
              className={`flex h-full w-full flex-col rounded-xl border p-2.5 text-left transition-colors ${
                active
                  ? "border-[color-mix(in_srgb,var(--graphite-primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)]"
                  : "border-[var(--mobile-app-card-border)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]"
              }`}
            >
              <span className="flex items-center justify-between gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
                  {tpl.discipline ? DISCIPLINE_LABEL[tpl.discipline] ?? tpl.discipline : "Custom"}
                </span>
                {active ? (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--graphite-primary)] text-[8px] font-bold text-black">
                    ✓
                  </span>
                ) : null}
              </span>
              <span className="mt-1 text-xs font-semibold leading-tight text-[var(--graphite-text-header)]">
                {tpl.name}
              </span>
              {tpl.standards && tpl.standards.length ? (
                <span className="mt-1 flex flex-wrap gap-1">
                  {tpl.standards.slice(0, 3).map((s) => (
                    <span key={s} className="rounded bg-[color-mix(in_srgb,var(--graphite-muted)_18%,transparent)] px-1 py-0.5 text-[8px] text-[var(--graphite-text-body)]">
                      {s}
                    </span>
                  ))}
                </span>
              ) : null}
              <SectionPreview sections={tpl.sections} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
