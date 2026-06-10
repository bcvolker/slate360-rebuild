"use client";

import { useCallback, useRef, useState } from "react";
import {
  isTwinCaptureVideoRecordingSupported,
  resolveTwinCaptureVideoMimeType,
} from "./twin-capture-ios";

export function useTwinCaptureVideoRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const startRecording = useCallback(
    (stream: MediaStream): { ok: true } | { ok: false; message: string } => {
      const fail = (message: string) => {
        setError(message);
        recorderRef.current = null;
        setRecording(false);
        return { ok: false as const, message };
      };

    setError(null);
    if (!isTwinCaptureVideoRecordingSupported()) {
      return fail("Video recording is not supported on this browser.");
    }

    const liveTracks = stream.getVideoTracks().filter((track) => track.readyState === "live");
    if (!liveTracks.length) {
      return fail("Camera stream is not active. Tap to resume camera.");
    }

    const mimeType = resolveTwinCaptureVideoMimeType();
    if (!mimeType) {
      return fail("No supported video format found for this device.");
    }

    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError("Recording failed. Try ending the clip and record again.");
        setRecording(false);
        recorderRef.current = null;
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setRecording(true);
      return { ok: true };
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Could not start recording.");
      }
    },
    [],
  );

  const stopRecording = useCallback(async (): Promise<File | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setRecording(false);
      return null;
    }

    const file = await new Promise<File | null>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];
        if (!blob.size) {
          setError("Recording produced no data. Try a shorter clip or retry.");
          resolve(null);
          return;
        }
        const ext = recorder.mimeType.includes("mp4") || recorder.mimeType.includes("quicktime")
          ? "mp4"
          : "webm";
        resolve(new File([blob], `walk_${Date.now()}.${ext}`, { type: recorder.mimeType }));
      };
      try {
        recorder.stop();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not stop recording.");
        resolve(null);
      }
    });

    recorderRef.current = null;
    setRecording(false);
    return file;
  }, []);

  return {
    recording,
    error,
    clearError,
    startRecording,
    stopRecording,
  };
}
