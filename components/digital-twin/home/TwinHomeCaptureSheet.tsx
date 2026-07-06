"use client";

import { Scan, MapPin, Upload, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { mobileTokens } from "@/components/mobile-system";

/**
 * Slice 2 (new Twin 360 home): the "New Scan" control opens this. Three real
 * entry paths with honest hierarchy — Quick Scan (the 90% default), Scan into a
 * project (the cross-app continuity path: keeps the twin with the project's
 * plans/files/walks), and Upload existing footage (secondary). Replaces the two
 * competing hero cards + the valueless quick-action grid.
 */

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuickScan: () => void;
  onScanIntoProject: () => void;
  onUpload: () => void;
  projectCount: number;
};

const ROW_BASE =
  "flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition active:scale-[0.99]";

export function TwinHomeCaptureSheet({
  open,
  onOpenChange,
  onQuickScan,
  onScanIntoProject,
  onUpload,
  projectCount,
}: Props) {
  const choose = (fn: () => void) => () => {
    onOpenChange(false);
    fn();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-none"
      >
        <SheetHeader className="text-left">
          <SheetTitle className={mobileTokens.appHomeSectionLabel}>New scan</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2.5">
          {/* Primary — Quick Scan */}
          <button
            type="button"
            onClick={choose(onQuickScan)}
            className={`${ROW_BASE} border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_8%,transparent)] hover:border-[color-mix(in_srgb,var(--twin360-blue)_45%,transparent)]`}
            data-twin-capture-choice="quick"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_14%,transparent)] text-[var(--twin360-blue)]">
              <Scan className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-zinc-100">Quick Scan</span>
              <span className="mt-0.5 block text-xs text-[var(--graphite-muted)]">
                Capture now — attach to a project later
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--twin360-blue)]" aria-hidden />
          </button>

          {/* Secondary — Scan into a project */}
          <button
            type="button"
            onClick={choose(onScanIntoProject)}
            className={`${ROW_BASE} border-white/10 bg-white/[0.04] hover:border-[var(--accent-border-blue)]`}
            data-twin-capture-choice="project"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] text-zinc-200">
              <MapPin className="h-6 w-6" strokeWidth={1.6} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-zinc-100">Scan into a project</span>
              <span className="mt-0.5 block text-xs text-[var(--graphite-muted)]">
                {projectCount > 0
                  ? "Keep it with the project's plans, files, and walks"
                  : "Create a project first, then scan with full context"}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/25" aria-hidden />
          </button>

          {/* Tertiary — Upload existing footage */}
          <button
            type="button"
            onClick={choose(onUpload)}
            className={`${ROW_BASE} border-white/10 bg-white/[0.04] hover:border-[var(--accent-border-blue)]`}
            data-twin-capture-choice="upload"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] text-zinc-200">
              <Upload className="h-6 w-6" strokeWidth={1.6} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-zinc-100">Upload existing footage</span>
              <span className="mt-0.5 block text-xs text-[var(--graphite-muted)]">
                Already have a walkthrough video? Process it into a twin
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/25" aria-hidden />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
