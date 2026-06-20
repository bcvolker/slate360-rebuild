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
    // Same frame as Inspect: section nav LEFT, the active panel CENTER.
    <div className="flex h-full min-h-0 gap-2 p-2">
      {/* LEFT: section nav */}
      <aside className="flex w-52 shrink-0 flex-col gap-1 rounded-xl border border-[var(--mobile-app-card-border)] p-2">
        <span className="px-1 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
          Deliver
        </span>
        {SUBTABS.map((s) => {
          const active = tab === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setTab(s.id)}
              className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                active
                  ? "bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-text-header)]"
                  : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </aside>

      {/* CENTER: the active panel */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[var(--mobile-app-card-border)] p-3">
        <div className="mx-auto w-full max-w-3xl">
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
