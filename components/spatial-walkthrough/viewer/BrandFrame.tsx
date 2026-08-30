"use client";

import type { CSSProperties, ReactNode } from "react";
import type { BrandTheme } from "@/lib/spatial-walkthrough/types";
import { themeCssVars } from "@/lib/spatial-walkthrough/theme";

type Props = {
  theme: BrandTheme;
  title: string;
  loading?: boolean;
  compact?: boolean;
  children: ReactNode;
};

export function BrandFrame({ theme, title, loading = false, compact = false, children }: Props) {
  const style = themeCssVars(theme) as CSSProperties;

  return (
    <div
      className={`relative flex flex-col bg-[var(--sw-page,var(--graphite-canvas))] text-[var(--sw-text,var(--graphite-text-header))] ${compact ? "h-full min-h-0" : "min-h-[100dvh]"}`}
      style={style}
    >
      {loading ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[var(--sw-page)]">
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.logoUrl} alt="" className="h-10 w-auto max-w-[220px] object-contain" />
          ) : null}
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--sw-muted)]">
            Spatial Walkthrough
          </p>
          <p className="text-sm text-[var(--sw-text)]">{title}</p>
        </div>
      ) : null}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        {theme.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={theme.logoUrl} alt="" className="h-7 w-auto max-w-[160px] object-contain" />
        ) : (
          <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em]">{title}</span>
        )}
        <span className="min-w-0 truncate text-sm text-[var(--sw-muted)]">{title}</span>
        {theme.showPoweredBy ? (
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sw-muted)]">
            Powered by Slate360
          </span>
        ) : (
          <span className="ml-auto" />
        )}
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}
