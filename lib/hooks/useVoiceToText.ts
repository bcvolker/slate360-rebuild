"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useVoiceToText — wraps the browser Web Speech API.
 *
 * Honest about its limits:
 *   - `supported` is false in browsers without SpeechRecognition (Firefox, in-app webviews).
 *   - `online` mirrors `navigator.onLine`. Web Speech requires a network round-trip
 *     in iOS Safari and Chrome — when `online === false`, callers should fall back
 *     to `useAudioRecorder` and queue the blob for server transcription.
 *
 * Returns separate `finalTranscript` (committed words) and `interimTranscript`
 * (in-progress, may change). Consumers should append finals only, and may render
 * interims in a lighter style.
 */
export interface UseVoiceToTextResult {
  supported: boolean;
  online: boolean;
  isListening: boolean;
  finalTranscript: string;
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useVoiceToText(lang: string = "en-US"): UseVoiceToTextResult {
  const [supported, setSupported] = useState(false);
  const [online, setOnline] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const processedIndexRef = useRef(0);

  // Detect support + online state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);
    setOnline(navigator.onLine);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Lazy construct on first start so we don't request mic on mount
  const ensureRecognition = useCallback((): SpeechRecognition | null => {
    if (recognitionRef.current) return recognitionRef.current;
    if (typeof window === "undefined") return null;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return null;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let appendFinal = "";
      for (let i = processedIndexRef.current; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          appendFinal += (appendFinal ? " " : "") + text.trim();
          processedIndexRef.current = i + 1;
        } else {
          interim += text;
        }
      }
      if (appendFinal) {
        setFinalTranscript((prev) => (prev ? prev + " " : "") + appendFinal);
      }
      setInterimTranscript(interim);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(event.error);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = rec;
    return rec;
  }, [lang]);

  const start = useCallback(() => {
    setError(null);
    const rec = ensureRecognition();
    if (!rec) {
      setError("not-supported");
      return;
    }
    if (!navigator.onLine) {
      // Don't even try — Web Speech needs network. Caller should record audio instead.
      setError("offline");
      return;
    }
    try {
      processedIndexRef.current = 0;
      rec.start();
      setIsListening(true);
    } catch {
      // start() throws if already started — ignore
    }
  }, [ensureRecognition]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* no-op */
    }
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);
    processedIndexRef.current = 0;
  }, []);

  // Stop on unmount
  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.abort();
        } catch {
          /* no-op */
        }
      }
    };
  }, []);

  return {
    supported,
    online,
    isListening,
    finalTranscript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
