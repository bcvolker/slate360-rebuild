"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import {
  uploadPlanSet,
  isPdfPlan,
  PlanUploadError,
  type PlanUploadProgress,
} from "@/lib/site-walk/plan-upload";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";
import type { ProjectPlansTabData, PlansTabPlanSet } from "@/lib/projects/plans-tab-data";

const STATUS_LABEL: Record<PlansTabPlanSet["status"], string> = {
  ready: "Ready",
  processing: "Converting",
  pending: "Queued",
  failed: "Failed",
  archived: "Archived",
};

/**
 * SW360-styled Plans tab. Reuses the same uploadPlanSet()/plan-set-status
 * plumbing as the desktop ProjectPlansTab (lib/site-walk/plan-upload.ts +
 * loadProjectPlansTabData) — only the presentation layer is new, to stay on
 * Field System tokens instead of the desktop Graphite Glass classes.
 */
export function SW360PlansTabClient({ data }: { data: ProjectPlansTabData }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<PlanUploadProgress | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const busy = progress !== null && progress.stage !== "complete" && progress.stage !== "error";

  async function handleStartWalk(planSetId: string) {
    setStartError(null);
    setStartingId(planSetId);
    try {
      const res = await fetch("/api/site-walk/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: data.projectId }),
      });
      const json = (await res.json().catch(() => ({}))) as { session?: { id?: string }; error?: string };
      const sessionId = json.session?.id;
      if (!res.ok || !sessionId) throw new Error(json.error ?? "Couldn't start the walk. Try again.");
      router.push(buildCaptureLaunchUrl({ session: sessionId, plan: planSetId }));
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "Couldn't start the walk.");
      setStartingId(null);
    }
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!isPdfPlan(file)) {
      setProgress({ stage: "error", message: "Plans accepts PDF plan sets only." });
      return;
    }
    try {
      await uploadPlanSet(data.projectId, file, setProgress);
      router.refresh();
    } catch (error) {
      setProgress({
        stage: "error",
        message: error instanceof PlanUploadError ? error.message : "Plan upload failed.",
      });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sw360-green-light)] text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
        {busy ? progress?.message ?? "Uploading…" : "Upload plan set (PDF)"}
      </button>
      {progress?.stage === "error" ? (
        <p className="text-xs font-semibold text-[var(--sw360-destructive)]">{progress.message}</p>
      ) : null}

      {data.planSets.length === 0 ? (
        <p className="text-sm text-[var(--sw360-charcoal)]/60">
          Add a PDF plan set to walk the job against its drawings.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.planSets.map((set) => (
            <div key={set.id} className="rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{set.title}</p>
                <span
                  className={
                    set.status === "failed"
                      ? "shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--sw360-destructive)]"
                      : "shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/50"
                  }
                >
                  {STATUS_LABEL[set.status]}
                </span>
              </div>
              {set.status === "failed" && set.processingError ? (
                <p className="mt-1 text-xs text-[var(--sw360-destructive)]">{set.processingError}</p>
              ) : null}
              {set.status === "ready" ? (
                <button
                  type="button"
                  disabled={startingId === set.id}
                  onClick={() => void handleStartWalk(set.id)}
                  className="mt-2 flex min-h-[36px] items-center gap-1.5 text-xs font-bold text-[var(--sw360-green-light)]"
                >
                  {startingId === set.id ? <Loader2 size={14} className="animate-spin" /> : null}
                  Start a walk on this plan
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {startError ? <p className="text-xs font-semibold text-[var(--sw360-destructive)]">{startError}</p> : null}
    </div>
  );
}
