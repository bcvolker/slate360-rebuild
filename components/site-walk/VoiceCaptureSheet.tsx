"use client";

import { useEffect, useState } from "react";
import { Mic, Square, Loader2, X, AlertCircle } from "lucide-react";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import { captureMetadata } from "@/lib/site-walk/metadata";

export interface VoiceCaptureSheetProps {
  sessionId: string;
  onClose: () => void;
  /** Called with the new item id once saved. */
  onSaved?: (itemId: string) => void;
}

/**
 * Bottom sheet that records a voice note, creates a `voice_note` item, then
 * uploads the raw audio blob via /api/site-walk/items/[id]/voice.
 *
 * Two-phase save (item-then-audio) is intentional so we always have an item
 * row even if the audio upload step fails — the user can re-record from the
 * item detail later.
 */
export default function VoiceCaptureSheet({ sessionId, onClose, onSaved }: VoiceCaptureSheetProps) {
  const audio = useAudioRecorder();
  const [busy, setBusy] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Tick a local clock while recording so the user sees duration progress.
  useEffect(() => {
    if (!audio.isRecording) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [audio.isRecording]);

  async function startRecording() {
    setError(null);
    const ok = await audio.start();
    if (!ok) {
      setError(audio.error === "not-supported" ? "Microphone not supported on this device" : "Microphone access denied");
    }
  }

  async function stopAndSave() {
    setBusy("saving");
    setError(null);
    try {
      const blob = await audio.stop();
      if (!blob) {
        setError("No audio captured");
        return;
      }

      const meta = await captureMetadata();

      // 1. Create the item shell
      const createRes = await fetch("/api/site-walk/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          item_type: "voice_note",
          title: `Voice — ${new Date().toLocaleTimeString()}`,
          latitude: meta.gps?.latitude ?? null,
          longitude: meta.gps?.longitude ?? null,
          weather: meta.weather ?? null,
          metadata: { ...meta, duration_ms: audio.durationMs },
        }),
      });
      const created = (await createRes.json()) as { item?: { id: string }; error?: string };
      if (!createRes.ok || !created.item) {
        setError(created.error ?? "Could not save note");
        return;
      }

      // 2. Upload raw audio bytes
      const fd = new FormData();
      fd.append("audio", blob, `voice-${Date.now()}.webm`);
      const upRes = await fetch(`/api/site-walk/items/${created.item.id}/voice`, {
        method: "POST",
        body: fd,
      });
      if (!upRes.ok) {
        const j = (await upRes.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Audio upload failed");
        return;
      }

      onSaved?.(created.item.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setBusy("idle");
    }
  }

  function format(s: number): string {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-slate-950 border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Mic className="h-4 w-4 text-cobalt" /> Voice note
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <div
            className={`relative h-24 w-24 rounded-full flex items-center justify-center transition-all ${
              audio.isRecording ? "bg-red-500/20 ring-4 ring-red-500/30 animate-pulse" : "bg-cobalt/15 ring-1 ring-cobalt/30"
            }`}
          >
            <Mic className={`h-9 w-9 ${audio.isRecording ? "text-red-400" : "text-cobalt"}`} />
          </div>
          <p className="text-2xl font-mono tabular-nums text-slate-100">{format(elapsed)}</p>
          <p className="text-xs text-slate-400">
            {audio.isRecording ? "Recording…" : busy === "saving" ? "Saving…" : "Tap to start"}
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-400 inline-flex items-center gap-1 justify-center w-full">
            <AlertCircle className="h-3 w-3" /> {error}
          </p>
        )}

        <div className="flex gap-2 justify-center pt-2">
          {!audio.isRecording && busy === "idle" && (
            <button
              type="button"
              onClick={() => void startRecording()}
              className="px-5 py-2.5 text-sm rounded-full bg-cobalt hover:bg-cobalt-hover text-white font-medium inline-flex items-center gap-2"
            >
              <Mic className="h-4 w-4" /> Start
            </button>
          )}
          {audio.isRecording && (
            <button
              type="button"
              onClick={() => void stopAndSave()}
              disabled={busy === "saving"}
              className="px-5 py-2.5 text-sm rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium inline-flex items-center gap-2"
            >
              {busy === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              Stop &amp; save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
