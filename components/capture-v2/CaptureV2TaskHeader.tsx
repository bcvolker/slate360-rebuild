"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { Fragment, useState } from "react";
import { useSiteWalkSession } from "@/components/site-walk/SiteWalkSessionProvider";
import { buildCaptureV2SummaryUrl } from "@/lib/site-walk/capture-v2-config";
import { CaptureV2SessionSyncBadge } from "./CaptureV2SyncBadge";
import { CAPTURE_V2_LAYERS } from "./layers";
import type { CaptureV2Session } from "./session-types";

type Props = {
  session: CaptureV2Session;
  stopLabel: string;
  contextLabel: string;
  onBack?: () => void;
};

export function CaptureV2TaskHeader({ session, stopLabel, contextLabel, onBack }: Props) {
  const router = useRouter();
  const { isOnline, isSyncing, pendingUploadCount } = useSiteWalkSession();
  const [exitOpen, setExitOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  const backClass =
    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl bg-amber-500 px-3 text-[11px] font-black uppercase tracking-[0.08em] text-slate-950 shadow-lg shadow-amber-500/20";

  async function endWalk() {
    setEnding(true);
    try {
      const response = await fetch(`/api/site-walk/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          sync_state: "synced",
          last_synced_at: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Could not end walk");
      router.push(buildCaptureV2SummaryUrl(session.id));
    } catch {
      setExitOpen(false);
    } finally {
      setEnding(false);
    }
  }

  function exitWalk() {
    router.push("/site-walk/walks");
  }

  return (
    <Fragment>
      <header
        className={`relative ${CAPTURE_V2_LAYERS.taskHeader} flex shrink-0 items-center gap-2 border-b border-white/5 bg-slate-950/90 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] text-white backdrop-blur-xl`}
      >
        {onBack ? (
          <button type="button" onClick={onBack} className={backClass} aria-label="Back">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <Link href="/site-walk" className={backClass} aria-label="Back to Site Walk">
            <ArrowLeft className="h-4 w-4" /> Site Walk
          </Link>
        )}

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-black text-white">
            {stopLabel} · {contextLabel}
          </p>
          <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/75">
            {session.title || session.project_name || "Current walk"}
          </p>
        </div>

        <CaptureV2SessionSyncBadge
          isOnline={isOnline}
          isSyncing={isSyncing}
          pendingUploadCount={pendingUploadCount}
          className="hidden shrink-0 sm:inline-flex"
        />

        <button
          type="button"
          onClick={() => setExitOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-red-500/25 bg-black/25 px-2.5 text-[10px] font-black text-red-200/85 hover:bg-red-500/15"
          aria-label="End or exit walk"
        >
          <LogOut className="h-3.5 w-3.5" /> Exit
        </button>
      </header>

      {exitOpen && (
        <div
          className={`fixed inset-0 ${CAPTURE_V2_LAYERS.modal} flex items-center justify-center bg-black/75 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-sm`}
          role="dialog"
          aria-modal="true"
          onClick={() => !ending && setExitOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-5 text-slate-50 shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-black text-white">Leave this walk?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Exit keeps the walk in progress. End walk marks the session complete and opens walk
              summary.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setExitOpen(false)}
                disabled={ending}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-black text-slate-200 hover:border-amber-400/50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setExitOpen(false);
                  exitWalk();
                }}
                disabled={ending}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-black text-slate-200 hover:border-amber-400/50 disabled:opacity-60"
              >
                Exit
              </button>
              <button
                type="button"
                onClick={() => void endWalk()}
                disabled={ending}
                className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60"
              >
                {ending ? "Ending…" : "End Walk"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
