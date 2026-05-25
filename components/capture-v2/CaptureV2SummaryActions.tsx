"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  buildCaptureSummaryFinishedUrl,
  buildCaptureV2LaunchUrl,
  buildCaptureV2SummaryUrl,
} from "@/lib/site-walk/capture-v2-config";
import { finalizeCaptureV2Walk } from "@/lib/site-walk-v2/finalize-capture-v2-walk";
import { loadCaptureV2StopDraftStore } from "@/lib/site-walk-v2/capture-stop-drafts";
import { draftHasCaptureContent } from "@/lib/site-walk-v2/promote-capture-v2-drafts";

type Props = {
  sessionId: string;
  sessionStatus: string;
  projectId?: string | null;
  projectName?: string | null;
};

export function CaptureV2SummaryActions({
  sessionId,
  sessionStatus,
  projectId = null,
  projectName = null,
}: Props) {
  const router = useRouter();
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const isCompleted = sessionStatus === "completed";

  async function endWalk() {
    setEnding(true);
    setEndError(null);
    try {
      const { store, metadata } = await loadCaptureV2StopDraftStore(sessionId);
      const hasDrafts = Object.values(store.stops).some(draftHasCaptureContent);

      if (hasDrafts) {
        const stopLabels = Object.fromEntries(
          Object.keys(store.stops).map((stopId) => [stopId, stopId]),
        );
        const { promotedCount } = await finalizeCaptureV2Walk({
          sessionId,
          store,
          metadata,
          stopLabels,
        });
        router.push(buildCaptureSummaryFinishedUrl(sessionId, promotedCount));
        return;
      }

      const response = await fetch(`/api/site-walk/sessions/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          sync_state: "synced",
          last_synced_at: new Date().toISOString(),
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Could not mark walk complete");
      router.push(buildCaptureSummaryFinishedUrl(sessionId, 0));
    } catch (error) {
      setEndError(error instanceof Error ? error.message : "Could not end walk");
    } finally {
      setEnding(false);
    }
  }

  return (
    <nav className="space-y-2" aria-label="Walk actions">
      {!isCompleted && (
        <Link
          href={buildCaptureV2LaunchUrl({ session: sessionId, plan: "skip" })}
          className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-amber-500 px-4 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
        >
          Continue Capture
        </Link>
      )}

      {!isCompleted && (
        <button
          type="button"
          onClick={() => void endWalk()}
          disabled={ending}
          className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-black text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-60"
        >
          {ending ? "Ending walk…" : "End Walk"}
        </button>
      )}

      {isCompleted && (
        <Link
          href={buildCaptureV2SummaryUrl(sessionId)}
          className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-200"
          aria-current="page"
        >
          Walk completed
        </Link>
      )}

      {projectId ? (
        <Link
          href={`/projects/${encodeURIComponent(projectId)}/field`}
          className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-200 hover:border-amber-400/30"
        >
          {projectName ? `Project: ${projectName}` : "Project field tab"}
        </Link>
      ) : null}

      <Link
        href="/site-walk"
        className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-200 hover:border-amber-400/30"
      >
        Site Walk Home
      </Link>

      <Link
        href="/site-walk/walks"
        className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-200 hover:border-amber-400/30"
      >
        Walks List
      </Link>

      {endError && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">
          {endError}
        </p>
      )}
    </nav>
  );
}
