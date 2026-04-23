"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Sparkles, Loader2, Save, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { useVoiceToText } from "@/lib/hooks/useVoiceToText";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import { useViewportInsets } from "@/lib/hooks/useViewportInsets";

export interface NoteCaptureBarProps {
  initialText?: string;
  placeholder?: string;
  saveLabel?: string;
  saving?: boolean;
  onSave: (text: string) => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Linear note capture surface.
 *
 * Three actions, in order of how a field user thinks:
 *   1. Speak (mic) — live transcription if online; queued audio + later
 *      transcription if offline.
 *   2. Boost (sparkles) — server-side AI rewrites rambling dictation into
 *      clean professional bullets.
 *   3. Save (disk) — commits to the item.
 *
 * The textarea is the source of truth. Voice + AI Boost mutate its value
 * directly so the user can always edit before saving.
 */
export default function NoteCaptureBar({
  initialText = "",
  placeholder = "What did you see?",
  saveLabel = "Save & Next",
  saving = false,
  onSave,
  onCancel,
}: NoteCaptureBarProps) {
  const [text, setText] = useState(initialText);
  const [boosting, setBoosting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const voice = useVoiceToText();
  const audio = useAudioRecorder();
  const { keyboardOffset } = useViewportInsets();
  const baseTextRef = useRef(initialText);

  // Live append: while listening, show interim/final on top of the user's
  // existing text. baseTextRef snapshots what was in the box when recording started.
  useEffect(() => {
    if (!voice.isListening) return;
    const sep = baseTextRef.current && !baseTextRef.current.endsWith(" ") ? " " : "";
    const combined =
      baseTextRef.current + sep + voice.finalTranscript + voice.interimTranscript;
    setText(combined);
  }, [voice.finalTranscript, voice.interimTranscript, voice.isListening]);

  const recording = voice.isListening || audio.isRecording;

  async function startRecording() {
    setWarning(null);
    baseTextRef.current = text;
    voice.reset();

    if (voice.online && voice.supported) {
      // Online + Web Speech available: live transcribe AND record audio so
      // we have a recoverable artifact if the connection drops mid-note.
      voice.start();
      await audio.start();
    } else {
      // Offline OR Web Speech unsupported: just record audio for later
      // server transcription.
      const ok = await audio.start();
      if (!ok) {
        setWarning(audio.error ?? "Microphone unavailable");
      }
    }
  }

  async function stopRecording() {
    if (voice.isListening) voice.stop();
    if (audio.isRecording) {
      const blob = await audio.stop();
      // If Web Speech produced text we trust it. Otherwise (offline / no
      // support / no result), upload the blob for server transcription.
      const gotLiveText = voice.finalTranscript.trim().length > 0;
      if (!gotLiveText && blob && blob.size > 0) {
        await transcribeBlob(blob);
      }
    }
  }

  async function transcribeBlob(blob: Blob) {
    setTranscribing(true);
    setWarning(null);
    try {
      const form = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      form.set("audio", blob, `note.${ext}`);
      const res = await fetch("/api/site-walk/notes/transcribe", { method: "POST", body: form });
      const json = (await res.json()) as { transcript?: string; error?: string };
      if (!res.ok || !json.transcript) {
        setWarning(json.error ?? "Transcription failed — please type your note");
        return;
      }
      const sep = baseTextRef.current && !baseTextRef.current.endsWith(" ") ? " " : "";
      setText(baseTextRef.current + sep + json.transcript);
    } catch {
      setWarning("Transcription failed — please type your note");
    } finally {
      setTranscribing(false);
    }
  }

  async function boost() {
    if (!text.trim()) {
      setWarning("Type or dictate something first");
      return;
    }
    setBoosting(true);
    setWarning(null);
    try {
      const res = await fetch("/api/site-walk/notes/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text }),
      });
      const json = (await res.json()) as { formattedText?: string; error?: string };
      if (!res.ok || !json.formattedText) {
        setWarning(json.error ?? "AI Boost failed");
        return;
      }
      setText(json.formattedText);
    } catch {
      setWarning("AI Boost failed");
    } finally {
      setBoosting(false);
    }
  }

  async function handleSave() {
    if (!text.trim() || saving) return;
    await onSave(text.trim());
  }

  const statusLine = recording
    ? voice.isListening
      ? "Listening… speak naturally"
      : "Recording — will transcribe when sent"
    : transcribing
      ? "Transcribing audio…"
      : voice.online
        ? voice.supported
          ? "Voice ready · live transcription"
          : "Voice ready · audio + server transcription"
        : "Offline · audio will be transcribed when online";

  const statusIcon = recording ? (
    <Mic className="h-3 w-3 text-red-400 animate-pulse" />
  ) : voice.online ? (
    <Wifi className="h-3 w-3 text-emerald-400" />
  ) : (
    <WifiOff className="h-3 w-3 text-amber-400" />
  );

  return (
    <div
      className="space-y-2"
      style={keyboardOffset > 0 ? { paddingBottom: keyboardOffset } : undefined}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={placeholder}
        autoFocus
        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt"
      />

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          {statusIcon}
          {statusLine}
        </span>
        {warning && (
          <span className="inline-flex items-center gap-1 text-amber-400">
            <AlertCircle className="h-3 w-3" />
            {warning}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={transcribing || saving}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition disabled:opacity-50 ${
            recording
              ? "bg-red-600/15 border-red-500/40 text-red-300"
              : "bg-white/5 border-white/10 hover:bg-cobalt/10 hover:border-cobalt/40 text-slate-100"
          }`}
        >
          {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {recording ? "Stop" : "Speak"}
        </button>

        <button
          type="button"
          onClick={boost}
          disabled={boosting || transcribing || saving || !text.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 disabled:opacity-50"
        >
          {boosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AI Boost
        </button>

        <div className="ml-auto flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="px-3 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || transcribing || !text.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cobalt hover:bg-cobalt-hover text-primary-foreground text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
