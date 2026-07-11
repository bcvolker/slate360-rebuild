"use client";

import type { ThermalReportTemplate } from "@/lib/thermal/report-templates";

/** Template picker — click-through gallery over the real thermal_report_templates API (doc §1, Tab 4). */
export function ReportTemplateGallery({
  templates,
  activeId,
  onSelect,
}: {
  templates: ThermalReportTemplate[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {templates.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          title={t.name}
          className={`flex flex-col gap-1 rounded-md border p-2 text-left transition-colors ${
            t.id === activeId ? "border-[var(--graphite-primary)]" : "border-[var(--mobile-app-card-border)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_45%,var(--mobile-app-card-border))]"
          }`}
        >
          <div className="flex h-14 w-full flex-col justify-between rounded bg-white p-1.5">
            <div className="h-1 w-2/3 rounded-full bg-slate-300" />
            <div className="flex flex-1 items-center gap-1 py-1">
              <div className="h-full w-1/2 rounded-sm bg-slate-100" />
              <div className="h-full w-1/2 rounded-sm bg-slate-100" />
            </div>
          </div>
          <span className="truncate text-[11px] font-semibold text-[var(--graphite-text-header)]">{t.name}</span>
          <span className="text-[10px] text-[var(--graphite-muted)]">{t.discipline}</span>
        </button>
      ))}
    </div>
  );
}
