"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderInput, Loader2, Pencil, Trash2 } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DigitalTwinProjectTargetSheet } from "@/components/digital-twin/DigitalTwinProjectTargetSheet";
import { mobileTokens } from "@/components/mobile-system";
import { deleteTwin, moveTwin, renameTwin } from "@/lib/digital-twin/twin-space-actions";
import { normalizeTwinTitle, TWIN_TITLE_MAX } from "@/lib/twin/twin-title";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

type Props = {
  twin: HubTwin | null;
  onClose: () => void;
  projects: HubTwinProject[];
};

const ROW =
  "flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-left text-sm font-semibold text-zinc-100 transition active:scale-[0.99] disabled:opacity-50";

/** S2 row actions: Rename · Move to project · Delete. One sheet, no nested menus. */
export function TwinRowActionsSheet({ twin, onClose, projects }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"menu" | "rename" | "delete">("menu");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setMode("menu");
    setTitle(twin?.title ?? "");
    setBusy(false);
    setError(null);
  }, [twin]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet open={twin !== null} onOpenChange={(o) => (!o ? onClose() : null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-none"
        >
          <SheetHeader className="text-left">
            <SheetTitle className={mobileTokens.appHomeSectionLabel}>{twin?.title ?? ""}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2.5">
            {mode === "menu" ? (
              <>
                <button type="button" className={ROW} onClick={() => setMode("rename")} data-twin-action="rename">
                  <Pencil className="h-5 w-5 text-[var(--graphite-muted)]" aria-hidden /> Rename
                </button>
                <button
                  type="button"
                  className={ROW}
                  disabled={projects.length === 0}
                  onClick={() => setPickerOpen(true)}
                  data-twin-action="move"
                >
                  <FolderInput className="h-5 w-5 text-[var(--graphite-muted)]" aria-hidden /> Move to project
                </button>
                <button type="button" className={ROW} onClick={() => setMode("delete")} data-twin-action="delete">
                  <Trash2 className="h-5 w-5 text-[var(--destructive)]" aria-hidden /> Delete
                </button>
              </>
            ) : null}

            {mode === "rename" ? (
              <>
                <input
                  autoFocus
                  value={title}
                  maxLength={TWIN_TITLE_MAX}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block min-h-[48px] w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent-border-blue)]"
                />
                <button
                  type="button"
                  disabled={busy || !normalizeTwinTitle(title)}
                  onClick={() => twin && run(() => renameTwin(twin.id, normalizeTwinTitle(title) ?? ""))}
                  className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--twin360-blue)] text-sm font-bold text-[var(--graphite-canvas)] disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Save name
                </button>
              </>
            ) : null}

            {mode === "delete" ? (
              <>
                <p className="text-sm leading-relaxed text-[var(--graphite-muted)]">
                  Delete this twin and its captures? The files stay in SlateDrop; the twin leaves every list.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => twin && run(() => deleteTwin(twin.id))}
                  className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-bold text-[var(--destructive)] disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Delete twin
                </button>
              </>
            ) : null}

            {error ? <p className="text-xs text-[var(--destructive)]">{error}</p> : null}
          </div>
        </SheetContent>
      </Sheet>

      <DigitalTwinProjectTargetSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projects={projects}
        onSelect={(p) => twin && run(() => moveTwin(twin.id, p.id))}
      />
    </>
  );
}
