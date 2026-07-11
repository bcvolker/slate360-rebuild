"use client";

import { useState } from "react";
import { DEFAULT_MOTION_SETTINGS, type MotionMode, type MotionSettings } from "@/components/thermal-studio-v2/lib/motion-api";

export type MotionRange = { inIdx: number; outIdx: number; playheadIdx: number };

type ModeState = { range: MotionRange; settings: MotionSettings };

function initialState(frameCount: number): ModeState {
  return { range: { inIdx: 0, outIdx: Math.max(0, frameCount - 1), playheadIdx: 0 }, settings: DEFAULT_MOTION_SETTINGS };
}

/**
 * Owns BOTH Motion editors' state at the Deliver-tab level (not inside the
 * editor itself) so "← Deliver" / Esc keeps the in/out range + settings —
 * doc D4's "returns to Deliver with state kept" — instead of losing them to
 * an unmount when the editor closes.
 */
export function useMotionState(frameCount: number) {
  const [timelapse, setTimelapse] = useState<ModeState>(() => initialState(frameCount));
  const [video, setVideo] = useState<ModeState>(() => initialState(frameCount));

  function stateFor(mode: MotionMode) {
    return mode === "timelapse" ? timelapse : video;
  }
  function setterFor(mode: MotionMode) {
    return mode === "timelapse" ? setTimelapse : setVideo;
  }

  function setRange(mode: MotionMode, range: MotionRange) {
    setterFor(mode)((prev) => ({ ...prev, range }));
  }
  function setSettings(mode: MotionMode, settings: MotionSettings) {
    setterFor(mode)((prev) => ({ ...prev, settings }));
  }

  return { stateFor, setRange, setSettings };
}
