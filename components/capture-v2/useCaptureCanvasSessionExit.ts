"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildCaptureSummaryFinishedUrl,
} from "@/lib/site-walk/capture-v2-config";
import { finalizeCaptureV2Walk } from "@/lib/site-walk-v2/finalize-capture-v2-walk";
import { loadCaptureV2StopDraftStore } from "@/lib/site-walk-v2/capture-stop-drafts";
import { draftHasCaptureContent } from "@/lib/site-walk-v2/promote-capture-v2-drafts";
import type { CaptureV2Session } from "./session-types";

type Args = {
  session: CaptureV2Session;
  onBeforeExit?: () => void;
};

export function useCaptureCanvasSessionExit({ session, onBeforeExit }: Args) {
  const router = useRouter();
  const [exitOpen, setExitOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  const openExitModal = useCallback(() => setExitOpen(true), []);

  const closeExitModal = useCallback(() => {
    if (ending) return;
    setExitOpen(false);
    setEndError(null);
  }, [ending]);

  const exitWalk = useCallback(() => {
    onBeforeExit?.();
    setExitOpen(false);
    setEndError(null);
    router.push("/site-walk/walks");
  }, [onBeforeExit, router]);

  const endWalk = useCallback(async () => {
    setEnding(true);
    setEndError(null);
    try {
      onBeforeExit?.();
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
  }, [onBeforeExit, router, session.id]);

  return {
    exitOpen,
    ending,
    endError,
    openExitModal,
    closeExitModal,
    exitWalk,
    endWalk,
  };
}
