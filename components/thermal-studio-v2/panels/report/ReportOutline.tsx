"use client";

import { useState } from "react";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";
import type { ReportSectionKey, ThermalReportTemplate } from "@/lib/thermal/report-templates";

const SECTION_LABELS: Record<ReportSectionKey, string> = {
  cover: "Cover",
  executive_summary: "Executive summary",
  methodology: "Methodology",
  site_info: "Site info",
  findings: "Findings",
  severity_table: "Severity scale",
  recommendations: "Recommendations",
  disclaimer: "Disclaimer",
  signature: "Signature",
};

/** Left rail — report outline: real HTML5 drag-reorder + section on/off toggles (doc §1, Tab 4). */
export function ReportOutline({
  order,
  byId,
  onReorder,
  onRemove,
  template,
  onToggleSection,
}: {
  order: string[];
  byId: Map<string, ThermalV2Capture>;
  onReorder: (next: string[]) => void;
  /** Audit remediation Batch 2: the outline was ★-add-only with no way back out. */
  onRemove: (id: string) => void;
  template: ThermalReportTemplate;
  onToggleSection: (key: ReportSectionKey, on: boolean) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = [...order];
    const from = next.indexOf(dragId);
    const to = next.indexOf(targetId);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    onReorder(next);
    setDragId(null);
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <div>
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
          Images ({order.length}) — drag to reorder
        </span>
        <div className="flex flex-col gap-0.5">
          {order.length === 0 ? (
            <p className="p-1 text-[11px] text-[var(--graphite-muted)]">Star ★ images in Library to add them here.</p>
          ) : (
            order.map((id) => {
              const c = byId.get(id);
              if (!c) return null;
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => setDragId(id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(id)}
                  title="Drag to reorder"
                  className={`flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-[11px] transition-colors ${
                    dragId === id ? "opacity-40" : "text-[var(--graphite-text-header)] hover:bg-[color-mix(in_srgb,var(--graphite-text-header)_5%,transparent)]"
                  }`}
                >
                  <span className="text-[var(--graphite-muted)]">⠿</span>
                  <span className="min-w-0 flex-1 truncate">{c.filename}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(id);
                    }}
                    aria-label={`Remove ${c.filename} from report`}
                    title="Remove from report"
                    className="shrink-0 rounded px-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div>
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Sections</span>
        <div className="flex flex-col gap-0.5">
          {(Object.keys(SECTION_LABELS) as ReportSectionKey[]).map((key) => (
            <label key={key} className="flex items-center gap-2 px-1 py-0.5 text-[11px] text-[var(--graphite-text-header)]">
              <input
                type="checkbox"
                checked={template.sections[key] !== false}
                onChange={(e) => onToggleSection(key, e.target.checked)}
              />
              {SECTION_LABELS[key]}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
