"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { mobileTokens } from "@/components/mobile-system";
import { quickCreateProject, startProjectWalk, StartWalkError } from "@/lib/site-walk/start-walk";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Quick-create a project from just a name, then immediately start a walk on it.
 * The rest of the project details are filled in later in the project section.
 * Used by the Site Walk home "Walk from project" door when no project exists.
 */
export function SiteWalkQuickCreateProjectSheet({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a project name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const project = await quickCreateProject(trimmed);
      const url = await startProjectWalk(project.id, project.name, "quick_create_walk");
      router.push(url);
    } catch (err) {
      setError(err instanceof StartWalkError ? err.message : "Could not start the walk. Try again.");
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-none"
      >
        <SheetHeader className="text-left">
          <span className={mobileTokens.siteWalkHomeSectionLabelAccent} aria-hidden />
          <SheetTitle className={mobileTokens.appHomeSectionLabel}>New project</SheetTitle>
        </SheetHeader>

        <p className="mt-2 text-sm text-[var(--graphite-muted)]">
          Just a name to get walking — you can fill in the rest in the project section later.
        </p>

        <div className="mt-4 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
            placeholder="Project name"
            autoFocus
            disabled={busy}
            className="h-12 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] px-4 text-base text-[var(--graphite-text-header)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]"
          />

          {error ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-500/25"
            >
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={busy || name.trim().length === 0}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--graphite-primary)] text-sm font-semibold text-[var(--graphite-canvas)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {busy ? "Creating…" : "Create & start walk"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
