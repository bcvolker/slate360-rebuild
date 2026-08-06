import { Wrench } from "lucide-react";

/** F2 (not yet built): embed DesktopSplatEditor + fix editor-vs-viewer splat-budget parity. */
export function CleanPanel() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <Wrench className="size-6 text-[var(--graphite-muted)]" aria-hidden />
      <p className="text-sm font-medium text-zinc-200">Clean — coming in Phase F2</p>
      <p className="max-w-sm text-xs text-[var(--graphite-muted)]">
        Will embed the desktop splat editor (crop/slice/erase/transform) here directly, with the
        same splat budget the shared viewer uses so what you clean matches what clients see.
      </p>
    </div>
  );
}
