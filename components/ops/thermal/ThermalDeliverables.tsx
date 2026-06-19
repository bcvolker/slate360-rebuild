"use client";

import { useState } from "react";
import { ThermalSharePanel } from "@/components/ops/thermal/ThermalSharePanel";
import { ThermalBrandingPanel } from "@/components/ops/thermal/ThermalBrandingPanel";
import { ThermalTwinLayerPanel } from "@/components/ops/thermal/ThermalTwinLayerPanel";
import type { ThermalBrandingConfig } from "@/lib/thermal/types";

type SubTab = "share" | "branding" | "twin";

const SUBTABS: { id: SubTab; label: string }[] = [
  { id: "share", label: "Share & export" },
  { id: "branding", label: "Branding" },
  { id: "twin", label: "Twin overlay" },
];

/**
 * Deliver workbench — no-scroll sub-tabs for sharing/export, branding, and the
 * twin overlay (demoted from a primary tab). Report generation lives in the
 * Report Builder tab.
 */
export function ThermalDeliverables({
  sessionId,
  brandingConfig,
  initialProjectId,
  linkedSpaceId,
}: {
  sessionId: string;
  brandingConfig: ThermalBrandingConfig;
  initialProjectId?: string | null;
  linkedSpaceId?: string | null;
}) {
  const [tab, setTab] = useState<SubTab>("share");

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
          {tab === "share" ? (
            <ThermalSharePanel sessionId={sessionId} initialProjectId={initialProjectId} />
          ) : null}
          {tab === "branding" ? (
            <ThermalBrandingPanel sessionId={sessionId} initial={brandingConfig} />
          ) : null}
          {tab === "twin" ? (
            <ThermalTwinLayerPanel sessionId={sessionId} linkedSpaceId={linkedSpaceId ?? null} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
