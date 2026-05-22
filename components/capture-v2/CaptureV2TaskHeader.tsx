"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSiteWalkSession } from "@/components/site-walk/SiteWalkSessionProvider";
import { buildCaptureSummaryUrl } from "@/lib/site-walk/capture-v2-config";
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

export function CaptureV2TaskHeader({ session, stopLabel, contextLabel, onBack }: Props) {
  const router = useRouter();
  const [exitOpen, setExitOpen] = useState(false);
  const [ending, setEnding] = useState(false);

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
      router.push(buildCaptureSummaryUrl(session.id));
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
    <>
      <SharedCaptureTaskHeader
        walkName={session.title || session.project_name || "Current walk"}
        stopLabel={stopLabel}
        contextLabel={contextLabel}
        backLabel={onBack ? "Back" : "Site Walk"}
        onBack={onBack}
        rightSlot={<CaptureV2SyncPill />}
        onExitClick={() => setExitOpen(true)}
      />

      <SessionExitModal
        open={exitOpen}
        ending={ending}
        onClose={() => !ending && setExitOpen(false)}
        onExit={() => {
          setExitOpen(false);
          exitWalk();
        }}
        onEnd={() => void endWalk()}
      />
    </>
  );
}
