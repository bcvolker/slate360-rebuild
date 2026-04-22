"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useAudioRecorder — wraps MediaRecorder for offline-safe voice capture.
 *
 * Always works (assuming mic permission). Used as the fallback when
 * `useVoiceToText` reports offline / unsupported, OR in parallel for users
 * who want an audio backup of their notes.
 */
export interface UseAudioRecorderResult {
  isRecording: boolean;
  audioBlob: Blob | null;
  durationMs: number;
  error: string | null;
  /** Returns true on success, false if mic permission denied / unsupported. */
  start: () => Promise<boolean>;
  /** Resolves with the recorded Blob (or null if nothing was captured). */
  stop: () => Promise<Blob | null>;
  reset: () => void;
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopResolverRef = useRef<((blob: Blob | null) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    setAudioBlob(null);
    setDurationMs(0);
    chunksRef.current = [];

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("not-supported");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick a mime type Safari + Chrome both honor
      const mime =
        ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) =>
          typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
        ) ?? "";

      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type }) : null;
        setAudioBlob(blob);
        setIsRecording(false);
        cleanup();
        const resolver = stopResolverRef.current;
        stopResolverRef.current = null;
        if (resolver) resolver(blob);
      };

      recorder.start(1000);
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      tickerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startedAtRef.current);
      }, 250);
      setIsRecording(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "mic-error");
      cleanup();
      return false;
    }
  }, [cleanup]);

  const stop = useCallback((): Promise<Blob | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") {
      return Promise.resolve(null);
    }
    return new Promise<Blob | null>((resolve) => {
      stopResolverRef.current = resolve;
      rec.stop();
    });
  }, []);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setDurationMs(0);
    setError(null);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  return { isRecording, audioBlob, durationMs, error, start, stop, reset };
}
