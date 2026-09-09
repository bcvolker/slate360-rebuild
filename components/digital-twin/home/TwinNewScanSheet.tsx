"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DigitalTwinProjectTargetSheet } from "@/components/digital-twin/DigitalTwinProjectTargetSheet";
import { mobileTokens } from "@/components/mobile-system";
import { buildTwinCaptureLaunchUrl } from "@/lib/digital-twin/twin-capture-launch";
import { defaultScanTitle } from "@/lib/digital-twin/twin-hub-state";
import { createTwinSpace, readLastProjectId, writeLastProjectId } from "@/lib/digital-twin/twin-space-actions";
import { normalizeTwinTitle, TWIN_TITLE_MAX } from "@/lib/twin/twin-title";
import type { HubTwinProject } from "@/lib/types/digital-twin-hub";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: HubTwinProject[];
  /** Project to preselect when the sheet opens from a project screen; null = last used. */
  preselectProjectId?: string | null;
  /** Fallback when nothing was used before: the newest project's id. */
  fallbackProjectId?: string | null;
};

const FIELD = "block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]";
const ROW =
  "flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-left transition active:scale-[0.99]";

/**
 * S3 New scan — one sheet, one decision: which twin this walk becomes.
 * Project defaults to the last one used (Decision 1); the name is prefilled and
 * editable; Start creates the twin and opens the native capture into it. The
 * capture presets (photos 1 s, shutter, AE lock) live on the capture HUD and
 * persist there; they move into this sheet in slice 3.
 */
export function TwinNewScanSheet({ open, onOpenChange, projects, preselectProjectId, fallbackProjectId }: Props) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const project = useMemo(() => projects.find((p) => p.id === projectId) ?? null, [projectId, projects]);

  // Resolve the default project each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    const ids = new Set(projects.map((p) => p.id));
    const last = readLastProjectId();
    let next: string | null = null;
    if (preselectProjectId !== undefined && (preselectProjectId === null || ids.has(preselectProjectId))) {
      next = preselectProjectId;
    } else if (last !== null && (last === "" || ids.has(last))) {
      next = last || null;
    } else if (fallbackProjectId && ids.has(fallbackProjectId)) {
      next = fallbackProjectId;
    } else {
      next = projects[0]?.id ?? null;
    }
    setProjectId(next);
    setTitleTouched(false);
    setError(null);
    setBusy(false);
  }, [open, projects, preselectProjectId, fallbackProjectId]);

  // Keep the default name in step with the project until the user edits it.
  useEffect(() => {
    if (!open || titleTouched) return;
    setTitle(defaultScanTitle(project?.name ?? null));
  }, [open, project, titleTouched]);

  const start = async () => {
    const clean = normalizeTwinTitle(title);
    if (!clean) {
      setError(`Give the scan a name (up to ${TWIN_TITLE_MAX} characters).`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const space = await createTwinSpace({ title: clean, projectId });
      writeLastProjectId(projectId);
      onOpenChange(false);
      router.push(
        buildTwinCaptureLaunchUrl({
          spaceId: space.id,
          projectId: space.projectId ?? undefined,
          mode: "project",
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the scan");
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-none"
        >
          <SheetHeader className="text-left">
            <SheetTitle className={mobileTokens.appHomeSectionLabel}>New scan</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <span className={FIELD}>Project</span>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className={`${ROW} hover:border-[var(--accent-border-blue)]`}
                data-twin-scan="project"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-100">
                    {project ? project.name : "Quick Scans · unfiled"}
                  </span>
                  <span className="block text-[11px] text-[var(--graphite-muted)]">
                    {project ? "Saved with the project's plans, files and walks" : "Move it into a project later"}
                  </span>
                </span>
                <span className="text-xs font-semibold text-[var(--twin360-blue)]">Change</span>
                <ChevronRight className="h-4 w-4 text-white/25" aria-hidden />
              </button>
              {project && projects.length > 0 ? (
                <button type="button" onClick={() => setProjectId(null)} className="px-1 text-[11px] text-[var(--graphite-muted)]">
                  Scan without a project instead
                </button>
              ) : null}
            </div>

            <label className="block space-y-1.5">
              <span className={FIELD}>Name</span>
              <input
                value={title}
                maxLength={TWIN_TITLE_MAX}
                onChange={(e) => {
                  setTitleTouched(true);
                  setTitle(e.target.value);
                }}
                className="block min-h-[48px] w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent-border-blue)]"
                data-twin-scan="name"
              />
            </label>

            {error ? <p className="text-xs text-[var(--destructive)]">{error}</p> : null}

            <button
              type="button"
              onClick={start}
              disabled={busy}
              className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--twin360-blue)] text-base font-bold text-[var(--graphite-canvas)] transition active:scale-[0.99] disabled:opacity-60"
              data-twin-scan="start"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
              {busy ? "Preparing…" : "Start scan"}
            </button>
            <p className="text-center text-[11px] leading-snug text-[var(--graphite-muted)]">
              Photos every second, shutter and exposure lock are set on the capture screen and remembered.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <DigitalTwinProjectTargetSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projects={projects}
        onSelect={(p) => setProjectId(p.id)}
      />
    </>
  );
}
