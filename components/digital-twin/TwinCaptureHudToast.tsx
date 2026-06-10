"use client";

import { TWIN_CAPTURE_GLASS_SQUARE } from "./twin-capture-glass";

type Props = {
  message: string | null;
  onDismiss?: () => void;
};

export function TwinCaptureHudToast({ message, onDismiss }: Props) {
  if (!message) return null;

  return (
    <div
      className="pointer-events-auto absolute inset-x-3 z-40 flex justify-center"
      style={{ top: "calc(max(env(safe-area-inset-top), 12px) + 64px)" }}
      data-twin-chrome="toast"
      role="status"
    >
      <button
        type="button"
        onClick={onDismiss}
        className={`max-w-sm px-3 py-2 text-center text-xs font-medium leading-snug text-[var(--graphite-text-header)] ${TWIN_CAPTURE_GLASS_SQUARE}`}
      >
        {message}
      </button>
    </div>
  );
}
