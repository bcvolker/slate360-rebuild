"use client";

import type { ReactNode } from "react";

export type DevDeviceMode = "mobile" | "desktop";

type Props = {
  mode: DevDeviceMode;
  title: string;
  children: ReactNode;
};

export function DevScreenFrame({ mode, title, children }: Props) {
  const isMobile = mode === "mobile";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--graphite-canvas)]">
      <p className="shrink-0 border-b border-[var(--mobile-app-card-border)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
        {title} · {isMobile ? "390px frame" : "desktop"}
      </p>
      <div className={`flex min-h-0 flex-1 justify-center overflow-hidden p-3 ${isMobile ? "" : ""}`}>
        <div
          className={`flex h-[844px] max-h-[844px] min-h-0 flex-col overflow-hidden border border-[var(--surface-zinc-border)] bg-[var(--graphite-canvas)] ${
            isMobile ? "w-[390px] max-w-full rounded-[1.75rem]" : "h-full w-full max-w-6xl rounded-2xl"
          }`}
          data-dev-device={mode}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
