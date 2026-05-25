"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSiteWalkSession } from "@/components/site-walk/SiteWalkSessionProvider";
import {
  buildCaptureSummaryFinishedUrl,
} from "@/lib/site-walk/capture-v2-config";
import { finalizeCaptureV2Walk } from "@/lib/site-walk-v2/finalize-capture-v2-walk";
import { loadCaptureV2StopDraftStore } from "@/lib/site-walk-v2/capture-stop-drafts";
import { draftHasCaptureContent } from "@/lib/site-walk-v2/promote-capture-v2-drafts";
import { SessionExitModal } from "./SessionExitModal";
import { SharedCaptureTaskHeader } from "./SharedCaptureTaskHeader";
import type { CaptureV2Session } from "./session-types";

type Props = {
  session: CaptureV2Session;
  stopLabel: string;
  contextLabel: string;
  onBack?: () => void;
};

function CaptureV2SyncPill() {
  const { pendingUploadCount, isSyncing, syncOfflineItems } = useSiteWalkSession();
  const queued = pendingUploadCount > 0 || isSyncing;

  return (
    <button
      type="button"
      onClick={() => void syncOfflineItems()}
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${
        queued ? "animate-pulse text-amber-500" : "text-emerald-400"
      }`}
      aria-label={queued ? `Queued ${pendingUploadCount} items — tap to sync` : "Synced"}
    >
      {queued ? `Queued: ${pendingUploadCount} items` : "Synced"}
    </button>
  );
}

function formatWalkName(session: CaptureV2Session): string {
  if (session.title?.trim()) return session.title.trim();
  if (session.project_name?.trim()) return session.project_name.trim();
  if (session.is_ad_hoc && session.started_at) {
    const dateLabel = new Date(session.started_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return `Quick Walk — ${dateLabel}`;
  }
  return "Current walk";
}

export function CaptureV2TaskHeader({ session, stopLabel, contextLabel, onBack }: Props) {
  const router = useRouter();
  const [exitOpen, setExitOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  async function endWalk() {
    setEnding(true);
    setEndError(null);
    try {
      const { store, metadata } = await loadCaptureV2StopDraftStore(session.id);
      const hasDrafts = Object.values(store.stops).some(draftHasCaptureContent);

      if (hasDrafts) {
        const stopLabels = Object.fromEntries(
          Object.keys(store.stops).map((stopId) => [stopId, stopId]),
        );
        const { promotedCount } = await finalizeCaptureV2Walk({
          sessionId: session.id,
          store,
          metadata,
          stopLabels,
        });
        router.push(buildCaptureSummaryFinishedUrl(session.id, promotedCount));
        return;
      }

      const response = await fetch(`/api/site-walk/sessions/${encodeURIComponent(session.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          sync_state: "synced",
          last_synced_at: new Date().toISOString(),
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Could not end walk");
      router.push(buildCaptureSummaryFinishedUrl(session.id, 0));
    } catch (error) {
      setEndError(error instanceof Error ? error.message : "Could not end walk");
    } finally {
      setEnding(false);
    }
  }

  function exitWalk() {
    router.push("/site-walk/walks");
  }

  return (
    <>
      <SharedCaptureTaskHeader
        walkName={formatWalkName(session)}
        stopLabel={stopLabel}
        contextLabel={contextLabel}
        isAdHoc={session.is_ad_hoc}
        backLabel={onBack ? "Back" : "Site Walk"}
        onBack={onBack}
        rightSlot={<CaptureV2SyncPill />}
        onExitClick={() => setExitOpen(true)}
      />

      <SessionExitModal
        open={exitOpen}
        ending={ending}
        error={endError}
        onClose={() => {
          if (ending) return;
          setExitOpen(false);
          setEndError(null);
        }}
        onExit={() => {
          setExitOpen(false);
          setEndError(null);
          exitWalk();
        }}
        onEnd={() => void endWalk()}
      />
    </>
  );
}
