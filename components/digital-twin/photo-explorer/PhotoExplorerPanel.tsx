"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { TwinCameraPose } from "@/lib/digital-twin/twin-cameras";

export function PhotoExplorerPanel({
  camera,
  photoUrl,
  onClose,
}: {
  camera: TwinCameraPose | null;
  photoUrl: string | null;
  onClose: () => void;
}) {
  if (!camera) return null;

  const positionLabel =
    camera.position && camera.position.length >= 3
      ? `${camera.position[0].toFixed(2)}, ${camera.position[1].toFixed(2)}, ${camera.position[2].toFixed(2)}`
      : "—";

  return (
    <aside
      className="absolute right-3 top-3 bottom-3 z-20 flex w-[min(100%,20rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] backdrop-blur-md"
      role="dialog"
      aria-label="Source photo"
    >
      <header className="flex items-start justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="min-w-0">
          <p className={cn("font-mono text-[10px] uppercase tracking-wider", twinAccent.text)}>
            Source photo
          </p>
          <h2 className="truncate text-sm font-semibold text-zinc-100">{camera.filename}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-white/10 p-1.5 text-zinc-400 transition-colors hover:text-zinc-100"
          aria-label="Close photo panel"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <div className="relative flex min-h-[12rem] flex-1 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={camera.filename}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <p className="px-4 text-center text-xs text-zinc-500">
              {camera.registered
                ? "Original still not available for this source (video frame or missing asset)."
                : "Camera was not registered in the reconstruction."}
            </p>
          )}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[10px] tracking-wide text-zinc-400">
          <dt>Position</dt>
          <dd className="truncate text-zinc-300">{positionLabel}</dd>
          <dt>Registered</dt>
          <dd className="text-zinc-300">{camera.registered ? "yes" : "no"}</dd>
        </dl>
      </div>
    </aside>
  );
}
