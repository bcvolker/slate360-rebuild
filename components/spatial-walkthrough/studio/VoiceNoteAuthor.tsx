"use client";

import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";

type Props = {
  walkthroughId: string;
  clipId: string;
  t: number;
  yaw: number;
  pitch: number;
  onRefresh: () => void;
};

export function VoiceNoteAuthor({ walkthroughId, clipId, t, yaw, pitch, onRefresh }: Props) {
  const rec = useAudioRecorder();
  const save = async (file: Blob) => {
    const body = new FormData();
    body.set("clipId", clipId);
    body.set("tSeconds", String(t));
    body.set("yawDeg", String(yaw));
    body.set("pitchDeg", String(pitch));
    body.set("label", "Voice note");
    body.set("file", file, "voice-note.webm");
    await fetch(`/api/spatial-walkthrough/${walkthroughId}/voice-notes`, { method: "POST", body });
    onRefresh();
  };
  return (
    <section className="space-y-2 border border-white/10 bg-white/[0.04] p-4" data-testid="sw-voice-author">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Voice note pin</p>
      <button
        type="button"
        className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-4 text-[var(--graphite-primary)]"
        onClick={() => (rec.isRecording ? void rec.stop().then((b) => b && save(b)) : void rec.start())}
      >
        {rec.isRecording ? "Stop & drop pin" : "Record voice pin at view"}
      </button>
    </section>
  );
}
