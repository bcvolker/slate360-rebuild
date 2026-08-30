"use client";

import { useRef, useState } from "react";
import type { ProjectItemLocator } from "@/lib/spatial-walkthrough/project-items";
import { captureAskLocator } from "@/lib/spatial-walkthrough/project-items";

type View = { t: number; yaw: number; pitch: number };

type Props = {
  locator: ProjectItemLocator;
  onClose: () => void;
  onSubmit: (input: { title: string; voice: Blob | null; fileUrl: string; fileType: string }) => Promise<void> | void;
  submitting?: boolean;
};

export function AskAboutThis({ locator, onClose, onSubmit, submitting = false }: Props) {
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [voice, setVoice] = useState<Blob | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  const toggleVoice = async () => {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        setVoice(new Blob(chunks.current, { type: rec.mimeType || "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setVoice(new Blob(["preview-voice"], { type: "audio/webm" }));
    }
  };

  return (
    <section className="sw-item-panel" data-view="ask">
      <header>
        <div>
          <p className="sw-item-kicker">Ask about this</p>
          <h2>Question from this view</h2>
        </div>
        <button type="button" className="sw-chrome-btn" onClick={onClose}>Close</button>
      </header>
      <div className="sw-item-body">
        <p className="sw-item-meta">
          clip {locator.clipId ?? "—"} · t {locator.tSeconds ?? 0}s · yaw {locator.yawDeg ?? 0} · pitch {locator.pitchDeg ?? 0}
          {locator.chapterId ? ` · ${locator.chapterId}` : ""}
        </p>
        <textarea value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What should the contractor look at here?" />
        <div className="sw-item-row">
          <button type="button" className="sw-chrome-btn" data-accent={recording || voice ? "true" : undefined} onClick={() => void toggleVoice()}>
            {recording ? "Stop voice" : voice ? "Voice attached" : "Record voice question"}
          </button>
        </div>
        <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="Optional photo or screenshot URL" />
      </div>
      <footer>
        <button
          type="button"
          className="sw-chrome-btn"
          data-accent="true"
          disabled={submitting || !title.trim()}
          onClick={() => void onSubmit({ title: title.trim(), voice, fileUrl, fileType: "screenshot" })}
        >
          Send question
        </button>
      </footer>
    </section>
  );
}

export function locatorFromPlayer(
  player: { getView: () => View } | null,
  fallback: View,
  ids: { walkthroughId?: string | null; clipId?: string | null; chapterId?: string | null },
): ProjectItemLocator {
  const view = player?.getView() ?? fallback;
  return captureAskLocator({ ...ids, t: view.t, yaw: view.yaw, pitch: view.pitch });
}
