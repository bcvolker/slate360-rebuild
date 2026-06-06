"use client";

import { useCallback, useRef, useState } from "react";

export function useTwinVideoRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);

  const startRecording = useCallback((stream: MediaStream) => {
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setRecording(true);
    setPaused(false);
  }, []);

  const pauseRecording = useCallback(() => {
    recorderRef.current?.pause();
    setPaused(true);
  }, []);

  const resumeRecording = useCallback(() => {
    recorderRef.current?.resume();
    setPaused(false);
  }, []);

  const stopRecording = useCallback(async (): Promise<File | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setRecording(false);
      setPaused(false);
      return null;
    }

    const file = await new Promise<File | null>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];
        if (!blob.size) {
          resolve(null);
          return;
        }
        const ext = recorder.mimeType.includes("mp4") ? "mp4" : "webm";
        resolve(new File([blob], `walk_${Date.now()}.${ext}`, { type: recorder.mimeType }));
      };
      recorder.stop();
    });

    recorderRef.current = null;
    setRecording(false);
    setPaused(false);
    return file;
  }, []);

  return {
    recording,
    paused,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
}
