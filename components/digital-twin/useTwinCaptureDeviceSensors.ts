"use client";

import { useCallback, useEffect, useState } from "react";
import { resolveTwinPaceState, type TwinCapturePaceState } from "./twin-capture-polish-tokens";

export type TwinSensorPermission = "unknown" | "granted" | "denied" | "unavailable";

type Args = {
  enabled?: boolean;
  devRollOverride?: number | null;
  devMotionSpeedOverride?: number | null;
};

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

async function requestIosSensorPermission(): Promise<TwinSensorPermission> {
  const ctor = DeviceOrientationEvent as OrientationCtor;
  if (typeof ctor.requestPermission !== "function") return "granted";
  try {
    const result = await ctor.requestPermission();
    return result === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export function useTwinCaptureDeviceSensors({
  enabled = true,
  devRollOverride = null,
  devMotionSpeedOverride = null,
}: Args = {}) {
  const [rollDeg, setRollDeg] = useState<number | null>(devRollOverride);
  const [permission, setPermission] = useState<TwinSensorPermission>(
    devRollOverride !== null && devRollOverride !== undefined ? "granted" : "unknown",
  );
  const [orientationSupported, setOrientationSupported] = useState(
    devRollOverride !== null && devRollOverride !== undefined,
  );
  const [lastOrientationEventAt, setLastOrientationEventAt] = useState<number | null>(null);
  const [paceState, setPaceState] = useState<TwinCapturePaceState>(() =>
    devMotionSpeedOverride !== null && devMotionSpeedOverride !== undefined
      ? resolveTwinPaceState(devMotionSpeedOverride)
      : null,
  );

  const sensorsActive = enabled && permission === "granted";
  const levelLineActive = permission === "granted";

  const requestPermission = useCallback(async (): Promise<TwinSensorPermission> => {
    if (devRollOverride !== null) return "granted";
    if (typeof window === "undefined") return "unavailable";
    if (permission === "granted" || permission === "denied") return permission;

    const next = await requestIosSensorPermission();
    setPermission(next);
    if (next === "granted") {
      setOrientationSupported(true);
    } else {
      setOrientationSupported(false);
      setRollDeg(null);
      setPaceState(null);
      setLastOrientationEventAt(null);
    }
    return next;
  }, [devRollOverride, permission]);

  useEffect(() => {
    if (devRollOverride !== null && devRollOverride !== undefined) {
      setRollDeg(devRollOverride);
      setOrientationSupported(true);
      setPermission("granted");
      setLastOrientationEventAt(Date.now());
    }
  }, [devRollOverride]);

  useEffect(() => {
    if (devMotionSpeedOverride !== null && devMotionSpeedOverride !== undefined) {
      setPaceState(resolveTwinPaceState(devMotionSpeedOverride));
    }
  }, [devMotionSpeedOverride]);

  useEffect(() => {
    if (!sensorsActive || devRollOverride !== null) return;
    if (typeof window === "undefined") return;

    let active = true;
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (!active) return;
      setLastOrientationEventAt(Date.now());
      if (event.gamma === null) return;
      setOrientationSupported(true);
      setRollDeg(event.gamma);
    };

    window.addEventListener("deviceorientation", onOrientation);
    return () => {
      active = false;
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, [devRollOverride, sensorsActive]);

  useEffect(() => {
    if (!sensorsActive || devMotionSpeedOverride !== null) return;
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
  }, [devMotionSpeedOverride, sensorsActive]);

  return {
    rollDeg,
    orientationSupported,
    levelLineActive,
    lastOrientationEventAt,
    paceState,
    permission,
    requestPermission,
  };
}
