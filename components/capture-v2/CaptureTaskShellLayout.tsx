import type { ReactNode } from "react";

/**
 * Capture V2 full-bleed task shell — fixed overlay escaping app chrome.
 * Uses flex propagation only; no raw 100dvh height locks.
 */
export function CaptureTaskShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex min-h-0 flex-col flex-grow overflow-hidden bg-[#0B0F15]">
      {children}
    </div>
  );
}
