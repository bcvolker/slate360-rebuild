"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Pause, Pencil, Play, Trash2 } from "lucide-react";
import type { VoiceMemoRow } from "./useCaptureV2VoiceMemos";
import { noteReviewTokens } from "./capture-v2-note-review-tokens";

type Props = {
  rows: VoiceMemoRow[];
  recording: boolean;
  busy: boolean;
  error: string | null;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onSaveTranscript: (memoId: string, transcript: string) => void;
  onDeleteMemo: (memoId: string, keepTranscript: boolean) => void;
};

function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CaptureV2VoiceMemosSection({
  rows,
  recording,
  busy,
  error,
  onStartRecord,
  onStopRecord,
  onSaveTranscript,
  onDeleteMemo,
}: Props) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!recording) {
      setElapsedMs(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 500);
    return () => window.clearInterval(timer);
  }, [recording]);
  return (
    <section className={`${noteReviewTokens.margin} pb-3`} data-note-review="voice-memos">
      <div className={noteReviewTokens.sectionCard}>
      <div className="flex items-center justify-between gap-2">
        <span className={noteReviewTokens.sectionLabel}>Voice memos</span>
        <span className="text-[10px] text-[var(--graphite-muted)]">saved as audio + transcript</span>
      </div>

      <div className="mt-2 space-y-2">
        {rows.map((row) => (
          <VoiceMemoRowView
            key={row.id}
            row={row}
            onSaveTranscript={onSaveTranscript}
            onDeleteMemo={onDeleteMemo}
          />
        ))}
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">
          {error}
        </p>
      )}

      <div className="mt-2">
        {!recording ? (
          <button
            type="button"
            disabled={busy}
            onClick={onStartRecord}
            className={`${noteReviewTokens.ghostButton} w-full`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            Record voice memo
          </button>
        ) : (
          <button
            type="button"
            onClick={onStopRecord}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 text-sm font-semibold text-red-300"
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-400" aria-hidden />
            Recording {formatDuration(elapsedMs)} — tap to stop &amp; save
          </button>
        )}
      </div>
      </div>
    </section>
  );
}

function VoiceMemoRowView({
  row,
  onSaveTranscript,
  onDeleteMemo,
}: {
  row: VoiceMemoRow;
  onSaveTranscript: (memoId: string, transcript: string) => void;
  onDeleteMemo: (memoId: string, keepTranscript: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.transcript);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setDraft(row.transcript), [row.transcript]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (!audio.duration) return;
      setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [row.audioUrl]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !row.audioUrl) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    void audio.play();
    setPlaying(true);
  }

  return (
    <div className={`${noteReviewTokens.cardSurface} p-2`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!row.audioUrl}
          className={noteReviewTokens.micButton}
          aria-label={playing ? "Pause memo" : "Play memo"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--surface-zinc)_60%,black)]">
            <div
              className="h-full bg-[var(--graphite-primary)] transition-[width]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] tabular-nums text-[var(--graphite-muted)]">
            {formatDuration(row.durationMs)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className={noteReviewTokens.micButton}
          aria-label="Edit transcript"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className={noteReviewTokens.micButton}
          aria-label="Delete memo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {row.audioUrl ? <audio ref={audioRef} src={row.audioUrl} preload="metadata" /> : null}

      {row.transcribing ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--graphite-muted)]">
          <Loader2 className="h-3 w-3 animate-spin" /> Transcribing…
        </p>
      ) : editing ? (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            onSaveTranscript(row.id, draft);
            setEditing(false);
          }}
          rows={2}
          className={`mt-2 ${noteReviewTokens.fieldInput} text-sm`}
        />
      ) : row.transcript ? (
        <p className="mt-2 break-words text-sm leading-snug text-[var(--graphite-text-body)]">{row.transcript}</p>
      ) : null}

      {confirmDelete && (
        <div className="mt-2 space-y-2 rounded-lg border border-[var(--mobile-app-card-border)] p-2">
          <p className="text-xs text-[var(--graphite-muted)]">Delete this voice memo?</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void onDeleteMemo(row.id, true);
                setConfirmDelete(false);
              }}
              className={noteReviewTokens.ghostButton}
            >
              Keep transcript as note
            </button>
            <button
              type="button"
              onClick={() => {
                void onDeleteMemo(row.id, false);
                setConfirmDelete(false);
              }}
              className="inline-flex min-h-9 flex-1 items-center justify-center rounded-xl border border-red-500/40 px-3 text-xs font-semibold text-red-300"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-[var(--graphite-muted)] underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
