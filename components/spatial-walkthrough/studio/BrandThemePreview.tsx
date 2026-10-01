"use client";

import type { BrandTheme, LogoTreatment } from "@/lib/spatial-walkthrough/types";
import type { CSSProperties } from "react";

type Props = {
  theme: BrandTheme;
  title?: string;
};

export function BrandThemePreview({ theme, title = "Level 12 — Mechanical" }: Props) {
  return (
    <div className="overflow-hidden border border-white/10" style={{ background: theme.pageBgColor, color: theme.textColor }}>
      <div className="flex h-11 items-center gap-3 border-b border-white/10 px-3" style={{ background: theme.surfaceColor }}>
        {theme.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={theme.logoUrl} alt="" className={`h-6 w-auto max-w-[120px] object-contain sw-logo--${theme.logoTreatment}`} />
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.14em]">{title}</span>
        )}
        <span className="truncate text-sm" style={{ color: theme.mutedTextColor }}>{title}</span>
        {theme.showPoweredBy ? (
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: theme.mutedTextColor }}>
            Powered by Slate360
          </span>
        ) : (
          <span className="ml-auto" />
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3 p-3">
        <div className="sw-preview-sphere min-h-[9.5rem]">
          <div className="sw-preview-grid" />
          <span className="sw-preview-mark" style={{ left: "46%", top: "58%" }}>
            <span className="sw-mark sw-mark--waypoint is-selected" style={{ "--sw-mark-scale": 1 } as CSSProperties}>
              <span className="sw-mark-leader" />
              <span className="sw-mark-core" />
              <span className="sw-mark-label">Station 04</span>
            </span>
          </span>
        </div>
        <div className="w-28 space-y-2 border border-white/10 p-2 text-[11px]" style={{ background: theme.surfaceColor }}>
          <p className="font-mono uppercase tracking-[0.12em]" style={{ color: theme.mutedTextColor }}>Pin</p>
          <p>Spec sheet</p>
          <p style={{ color: theme.accentColor }}>Open PDF</p>
        </div>
      </div>
    </div>
  );
}

export const LOGO_TREATMENTS: LogoTreatment[] = ["auto", "light", "dark"];
