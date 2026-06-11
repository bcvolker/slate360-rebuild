"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { publishCaptureItemFocus } from "@/components/site-walk/capture/capture-item-events";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

export type VoiceMemoRow = {
  id: string;
  audioUrl: string | null;
  durationMs: number;
  transcript: string;
  transcribing: boolean;
};

type Args = {
  sessionId: string;
  parentItemId: string;
  sessionItems: CaptureItemRecord[];
  onAppendNote?: (text: string) => void;
};

function readTranscript(item: CaptureItemRecord): string {
  if (item.description?.trim()) return item.description.trim();
  const meta = item.metadata;
  if (meta && typeof meta === "object") {
    const transcript = (meta as Record<string, unknown>).transcript;
    if (typeof transcript === "string") return transcript;
  }
  return "";
}

function readDurationMs(item: CaptureItemRecord): number {
  const meta = item.metadata;
  if (meta && typeof meta === "object") {
    const duration = (meta as Record<string, unknown>).duration_ms;
    if (typeof duration === "number") return duration;
  }
  return 0;
}

export function useCaptureV2VoiceMemos({
  sessionId,
  parentItemId,
  sessionItems,
  onAppendNote,
}: Args) {
  const audio = useAudioRecorder();
  const blobUrlsRef = useRef<Map<string, string>>(new Map());
  const [localRows, setLocalRows] = useState<VoiceMemoRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const childItems = useMemo(
    () =>
      sessionItems.filter(
        (item) => item.before_item_id === parentItemId && item.item_type === "voice_note",
      ),
    [parentItemId, sessionItems],
  );

  useEffect(() => {
    setLocalRows((current) => {
      const next: VoiceMemoRow[] = childItems.map((item) => {
        const existing = current.find((row) => row.id === item.id);
        return {
          id: item.id,
          audioUrl: existing?.audioUrl ?? blobUrlsRef.current.get(item.id) ?? null,
          durationMs: existing?.durationMs || readDurationMs(item),
          transcript: existing?.transcript ?? readTranscript(item),
          transcribing: existing?.transcribing ?? false,
        };
      });
      return next;
    });
  }, [childItems]);

  useEffect(
    () => () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current.clear();
    },
    [],
  );

  const saveTranscript = useCallback(
    async (memoId: string, transcript: string) => {
      setLocalRows((rows) =>
        rows.map((row) => (row.id === memoId ? { ...row, transcript } : row)),
      );
      const response = await fetch(`/api/site-walk/items/${encodeURIComponent(memoId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: transcript }),
      });
      if (!response.ok) {
        setError("Could not save the transcript edit — try again.");
        return;
      }
      const data = (await response.json().catch(() => null)) as {
        item?: CaptureItemRecord;
      } | null;
      if (data?.item) {
        publishCaptureItemFocus({ item: data.item, reason: "selected", focus: false });
      }
    },
    [],
  );

  const stopAndSaveMemo = useCallback(async () => {
    if (!audio.isRecording) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await audio.stop();
      if (!blob || blob.size === 0) {
        setError("No audio captured");
        return;
      }

      const createRes = await fetch("/api/site-walk/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          item_type: "voice_note",
          title: `Voice memo — ${new Date().toLocaleTimeString()}`,
          before_item_id: parentItemId,
          // DB check constraint only allows standalone/resolution/rework/before/
          // after/progress; the parent link lives in before_item_id.
          item_relationship: "standalone",
          metadata: { duration_ms: audio.durationMs, parent_stop_id: parentItemId },
        }),
      });
      const created = (await createRes.json()) as { item?: CaptureItemRecord; error?: string };
      if (!createRes.ok || !created.item) {
        setError(created.error ?? "Could not create voice memo");
        return;
      }

      const memoId = created.item.id;
      const blobUrl = URL.createObjectURL(blob);
      blobUrlsRef.current.set(memoId, blobUrl);

      const fd = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      fd.append("audio", blob, `voice-${Date.now()}.${ext}`);
      const upRes = await fetch(`/api/site-walk/items/${encodeURIComponent(memoId)}/voice`, {
        method: "POST",
        body: fd,
      });
      if (!upRes.ok) {
        const j = (await upRes.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Audio upload failed — memo not saved, try again.");
        // Roll back the just-created item so a failed upload leaves no orphan
        // DB row that the UI never shows.
        void fetch(`/api/site-walk/items/${encodeURIComponent(memoId)}`, { method: "DELETE" });
        return;
      }

      publishCaptureItemFocus({ item: created.item, reason: "selected", focus: false });
      setLocalRows((rows) => [
        ...rows,
        {
          id: memoId,
          audioUrl: blobUrl,
          durationMs: audio.durationMs,
          transcript: "",
          transcribing: true,
        },
      ]);

      const txRes = await fetch("/api/site-walk/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: memoId }),
      });
      const txData = (await txRes.json()) as { transcript?: string; error?: string };
      const transcript = txRes.ok && txData.transcript ? txData.transcript : "";
      setLocalRows((rows) =>
        rows.map((row) =>
          row.id === memoId ? { ...row, transcript, transcribing: false } : row,
        ),
      );
      if (transcript) await saveTranscript(memoId, transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice memo failed");
    } finally {
      setBusy(false);
    }
  }, [audio, parentItemId, saveTranscript, sessionId]);

  const startMemo = useCallback(async () => {
    setError(null);
    const ok = await audio.start();
    if (!ok) setError(audio.error ?? "Microphone unavailable");
  }, [audio]);

  const deleteMemo = useCallback(
    async (memoId: string, keepTranscript: boolean) => {
      const row = localRows.find((current) => current.id === memoId);
      if (keepTranscript && row?.transcript.trim() && onAppendNote) {
        onAppendNote(row.transcript.trim());
      }
      const response = await fetch(`/api/site-walk/items/${encodeURIComponent(memoId)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError("Could not delete voice memo");
        return;
      }
      const blobUrl = blobUrlsRef.current.get(memoId);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrlsRef.current.delete(memoId);
      }
      setLocalRows((rows) => rows.filter((current) => current.id !== memoId));
    },
    [localRows, onAppendNote],
  );

  return {
    rows: localRows,
    recording: audio.isRecording,
    busy,
    error,
    startMemo,
    stopAndSaveMemo,
    saveTranscript,
    deleteMemo,
  };
}
