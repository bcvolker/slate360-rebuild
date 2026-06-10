"use client";

import { useEffect, useState } from "react";
import { resolveTwinPaceState, type TwinCapturePaceState } from "./twin-capture-polish-tokens";

type Args = {
  enabled?: boolean;
  devRollOverride?: number | null;
  devMotionSpeedOverride?: number | null;
};

export function useTwinCaptureDeviceSensors({
  enabled = true,
  devRollOverride = null,
  devMotionSpeedOverride = null,
}: Args = {}) {
  const [rollDeg, setRollDeg] = useState<number | null>(devRollOverride);
  const [orientationSupported, setOrientationSupported] = useState(
    devRollOverride !== null && devRollOverride !== undefined,
  );
  const [paceState, setPaceState] = useState<TwinCapturePaceState>(() =>
    devMotionSpeedOverride !== null && devMotionSpeedOverride !== undefined
      ? resolveTwinPaceState(devMotionSpeedOverride)
      : null,
  );

  useEffect(() => {
    if (devRollOverride !== null && devRollOverride !== undefined) {
      setRollDeg(devRollOverride);
      setOrientationSupported(true);
    }
  }, [devRollOverride]);

  useEffect(() => {
    if (devMotionSpeedOverride !== null && devMotionSpeedOverride !== undefined) {
      setPaceState(resolveTwinPaceState(devMotionSpeedOverride));
    }
  }, [devMotionSpeedOverride]);

  useEffect(() => {
    if (!enabled || devRollOverride !== null) return;
    if (typeof window === "undefined") return;

    let active = true;
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (!active || event.gamma === null) return;
      setOrientationSupported(true);
      setRollDeg(event.gamma);
    };

    window.addEventListener("deviceorientation", onOrientation);
    return () => {
      active = false;
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, [devRollOverride, enabled]);

  useEffect(() => {
    if (!enabled || devMotionSpeedOverride !== null) return;
    if (typeof window === "undefined") return;

    let active = true;
    const onMotion = (event: DeviceMotionEvent) => {
      if (!active) return;
      const rate = event.rotationRate;
      if (!rate || rate.alpha === null || rate.beta === null || rate.gamma === null) {
        setPaceState(null);
        return;
      }
      const speed = Math.hypot(rate.alpha, rate.beta, rate.gamma);
      setPaceState(resolveTwinPaceState(speed));
    };

    window.addEventListener("devicemotion", onMotion);
    return () => {
      active = false;
      window.removeEventListener("devicemotion", onMotion);
    };
  }, [devMotionSpeedOverride, enabled]);

  return { rollDeg, orientationSupported, paceState };
}
