"use client";

import { useCallback, useRef, useState } from "react";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";

type Args = {
  notes: string;
  onNotesChange: (value: string) => void;
};

export function useCaptureV2NoteDictation({ notes, onNotesChange }: Args) {
  const audio = useAudioRecorder();
  const baseTextRef = useRef(notes);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recording = audio.isRecording;

  const startDictation = useCallback(async () => {
    setError(null);
    baseTextRef.current = notes;
    const ok = await audio.start();
    if (!ok) setError(audio.error ?? "Microphone unavailable");
  }, [audio, notes]);

  const stopDictation = useCallback(async () => {
    if (!audio.isRecording) return;
    const blob = await audio.stop();
    if (!blob || blob.size === 0) return;
    setTranscribing(true);
    setError(null);
    try {
      const form = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      form.set("audio", blob, `note.${ext}`);
      const res = await fetch("/api/site-walk/notes/transcribe", { method: "POST", body: form });
      const json = (await res.json()) as { transcript?: string; error?: string };
      if (!res.ok || !json.transcript) {
        setError(json.error ?? "Transcription failed");
        return;
      }
      const base = baseTextRef.current;
      const sep = base && !base.endsWith(" ") && !base.endsWith("\n") ? " " : "";
      onNotesChange(base + sep + json.transcript);
    } catch {
      setError("Transcription failed");
    } finally {
      setTranscribing(false);
    }
  }, [audio, onNotesChange]);

  const toggleDictation = useCallback(() => {
    if (recording) void stopDictation();
    else void startDictation();
  }, [recording, startDictation, stopDictation]);

  return {
    recording,
    transcribing,
    error,
    toggleDictation,
    disabled: transcribing,
  };
}
