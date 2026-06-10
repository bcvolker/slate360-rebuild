"use client";

import type { ReactNode } from "react";

export type DevDeviceMode = "mobile" | "desktop";

type Props = {
  mode: DevDeviceMode;
  title: string;
  children: ReactNode;
  frameWidth?: number;
  frameHeight?: number;
};

export function DevScreenFrame({ mode, title, children, frameWidth, frameHeight }: Props) {
  const isMobile = mode === "mobile";
  const width = frameWidth ?? 390;
  const height = frameHeight ?? 844;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--graphite-canvas)]">
      <p className="shrink-0 border-b border-[var(--mobile-app-card-border)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
        {title} · {isMobile ? `${width}×${height} frame` : "desktop"}
      </p>
      <div className="flex min-h-0 flex-1 justify-center overflow-hidden p-3">
        <div
          className={`flex min-h-0 flex-col overflow-hidden border border-[var(--surface-zinc-border)] bg-[var(--graphite-canvas)] ${
            isMobile ? "max-w-full rounded-[1.75rem]" : "h-full w-full max-w-6xl rounded-2xl"
          }`}
          style={isMobile ? { width, height, maxHeight: height } : undefined}
          data-dev-device={mode}
          data-dev-frame-width={width}
          data-dev-frame-height={height}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
