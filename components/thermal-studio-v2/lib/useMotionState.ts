"use client";

import { useState } from "react";
import { DEFAULT_MOTION_SETTINGS, type MotionMode, type MotionSettings } from "@/components/thermal-studio-v2/lib/motion-api";

export type MotionRange = { inIdx: number; outIdx: number; playheadIdx: number };

type ModeState = { range: MotionRange; settings: MotionSettings };

function initialState(frameCount: number): ModeState {
  return { range: { inIdx: 0, outIdx: Math.max(0, frameCount - 1), playheadIdx: 0 }, settings: DEFAULT_MOTION_SETTINGS };
}

/**
 * Owns BOTH Motion editors' state. Originally instantiated inside
 * DeliverPanel so "← Deliver" / Esc kept the in/out range + settings across
 * the in-component editor toggle (doc D4's "returns to Deliver with state
 * kept") — but DeliverPanel itself unmounts on every SHELL tab switch, which
 * reset the range anyway (audit remediation Batch 1, confirmed bug). Now
 * instantiated in ThermalV2Shell, which never unmounts across tab changes,
 * and passed down as a prop.
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

export type MotionState = ReturnType<typeof useMotionState>;
