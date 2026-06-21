"use client";

import { useState } from "react";
import { Panel, PanelGroup } from "react-resizable-panels";
import { StudioHandle } from "@/components/studio/StudioPanels";
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
    // Resizable frame: section nav LEFT, the active panel CENTER.
    <div className="h-full min-h-0 p-2">
      <PanelGroup direction="horizontal" className="h-full min-h-0">
      {/* LEFT: section nav */}
      <Panel order={1} collapsible collapsedSize={0} defaultSize={20} minSize={12} className="min-w-0">
      <aside className="flex h-full min-h-0 flex-col gap-1 rounded-xl border border-[var(--mobile-app-card-border)] p-2">
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
      </Panel>
      <StudioHandle vertical />

      {/* CENTER: the active panel */}
      <Panel order={2} defaultSize={80} minSize={40} className="min-w-0">
      <div className="h-full min-h-0 overflow-y-auto rounded-xl border border-[var(--mobile-app-card-border)] p-3">
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
      </Panel>
      </PanelGroup>
    </div>
  );
}
