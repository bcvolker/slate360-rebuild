"use client";

import { useState } from "react";
import { ThermalReportPanel } from "@/components/ops/thermal/ThermalReportPanel";
import { ThermalSharePanel } from "@/components/ops/thermal/ThermalSharePanel";
import { ThermalBrandingPanel } from "@/components/ops/thermal/ThermalBrandingPanel";
import type { ThermalBrandingConfig } from "@/lib/thermal/types";

type SubTab = "report" | "share" | "branding";

const SUBTABS: { id: SubTab; label: string }[] = [
  { id: "report", label: "Report" },
  { id: "share", label: "Share & export" },
  { id: "branding", label: "Branding" },
];

/** Deliverables workbench — no-scroll sub-tabs for report, sharing, and branding. */
export function ThermalDeliverables({
  sessionId,
  brandingConfig,
  initialTemplateId,
  initialSignature,
  initialProjectId,
}: {
  sessionId: string;
  brandingConfig: ThermalBrandingConfig;
  initialTemplateId?: string | null;
  initialSignature?: string | null;
  initialProjectId?: string | null;
}) {
  const [tab, setTab] = useState<SubTab>("report");

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <nav className="flex flex-wrap items-center gap-1.5" aria-label="Deliverables sub-stages">
        {SUBTABS.map((s) => {
          const active = tab === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setTab(s.id)}
              className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
                  : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="m-auto w-full max-w-5xl">
          {tab === "report" ? (
            <ThermalReportPanel
              sessionId={sessionId}
              initialTemplateId={initialTemplateId}
              initialSignature={initialSignature}
            />
          ) : null}
          {tab === "share" ? (
            <ThermalSharePanel sessionId={sessionId} initialProjectId={initialProjectId} />
          ) : null}
          {tab === "branding" ? (
            <ThermalBrandingPanel sessionId={sessionId} initial={brandingConfig} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
