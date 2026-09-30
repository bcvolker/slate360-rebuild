"use client";

import type { ReactElement } from "react";

export function KitchenWebglRecovery({
  lost,
  onReload,
}: {
  lost: boolean;
  onReload: () => void;
}): ReactElement | null {
  if (!lost) return null;
  return (
    <div
      className="absolute inset-x-0 bottom-24 z-40 flex justify-center"
      data-testid="kitchen-webgl-lost"
    >
      <button type="button" className="kv-btn pointer-events-auto" onClick={onReload}>
        Reload viewer
      </button>
    </div>
  );
}
