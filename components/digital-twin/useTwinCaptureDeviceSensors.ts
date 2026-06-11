"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveTwinGuideState,
  TWIN_CAPTURE_GUIDE,
  type TwinCaptureGuideState,
} from "./twin-capture-polish-tokens";

export type TwinSensorPermission = "unknown" | "granted" | "denied" | "unavailable";

type Args = {
  enabled?: boolean;
  guideActive?: boolean;
  devRollOverride?: number | null;
  devPaceVarianceOverride?: number | null;
  devStabilityVarianceOverride?: number | null;
};

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function computeVariance(samples: number[]): number {
  if (samples.length < 2) return 0;
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / samples.length;
}

function pushSample(buffer: number[], value: number, max: number) {
  buffer.push(value);
  if (buffer.length > max) buffer.shift();
}

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
  guideActive = false,
  devRollOverride = null,
  devPaceVarianceOverride = null,
  devStabilityVarianceOverride = null,
}: Args = {}) {
  const devVarianceFixture =
    devPaceVarianceOverride !== null && devStabilityVarianceOverride !== null;
  const devFixtureActive = devRollOverride !== null || devVarianceFixture;

  const [rollDeg, setRollDeg] = useState<number | null>(devRollOverride);
  const [permission, setPermission] = useState<TwinSensorPermission>(
    devFixtureActive ? "granted" : "unknown",
  );
  const [orientationSupported, setOrientationSupported] = useState(devFixtureActive);
  const [lastOrientationEventAt, setLastOrientationEventAt] = useState<number | null>(null);
  const [paceVariance, setPaceVariance] = useState(
    devVarianceFixture ? devPaceVarianceOverride : 0,
  );
  const [stabilityVariance, setStabilityVariance] = useState(
    devVarianceFixture ? devStabilityVarianceOverride : 0,
  );
  const [guideState, setGuideState] = useState<TwinCaptureGuideState>(() => {
    if (!devVarianceFixture) return null;
    return resolveTwinGuideState(devPaceVarianceOverride!, devStabilityVarianceOverride!);
  });

  const accelSamplesRef = useRef<number[]>([]);
  const gyroSamplesRef = useRef<number[]>([]);
  const pendingStateRef = useRef<Exclude<TwinCaptureGuideState, null> | null>(null);
  const pendingSinceRef = useRef<number | null>(null);
  const committedStateRef = useRef<Exclude<TwinCaptureGuideState, null> | null>(
    devVarianceFixture
      ? resolveTwinGuideState(devPaceVarianceOverride!, devStabilityVarianceOverride!)
      : null,
  );
  const lastTickRef = useRef(0);

  const sensorsActive = enabled && permission === "granted";
  const levelLineActive = permission === "granted";
  const guideSensorsActive = sensorsActive && guideActive;

  const commitGuideState = useCallback((next: Exclude<TwinCaptureGuideState, null>) => {
    committedStateRef.current = next;
    setGuideState(next);
  }, []);

  const evaluateGuideState = useCallback(
    (pace: number, stability: number) => {
      const raw = resolveTwinGuideState(pace, stability);
      const now = Date.now();
      if (committedStateRef.current === raw) {
        pendingStateRef.current = null;
        pendingSinceRef.current = null;
        return;
      }
      if (pendingStateRef.current !== raw) {
        pendingStateRef.current = raw;
        pendingSinceRef.current = now;
        return;
      }
      if (
        pendingSinceRef.current !== null &&
        now - pendingSinceRef.current >= TWIN_CAPTURE_GUIDE.stateHysteresisMs
      ) {
        commitGuideState(raw);
        pendingStateRef.current = null;
        pendingSinceRef.current = null;
      }
    },
    [commitGuideState],
  );

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
      setGuideState(null);
      setPaceVariance(0);
      setStabilityVariance(0);
      setLastOrientationEventAt(null);
      accelSamplesRef.current = [];
      gyroSamplesRef.current = [];
      committedStateRef.current = null;
      pendingStateRef.current = null;
      pendingSinceRef.current = null;
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
    if (!guideSensorsActive) {
      setGuideState(null);
      committedStateRef.current = null;
      pendingStateRef.current = null;
      pendingSinceRef.current = null;
      return;
    }

    if (devPaceVarianceOverride !== null && devStabilityVarianceOverride !== null) {
      setPaceVariance(devPaceVarianceOverride);
      setStabilityVariance(devStabilityVarianceOverride);
      commitGuideState(resolveTwinGuideState(devPaceVarianceOverride, devStabilityVarianceOverride));
      return;
    }

    if (typeof window === "undefined") return;

    let active = true;
    const onMotion = (event: DeviceMotionEvent) => {
      if (!active) return;
      const now = Date.now();
      if (now - lastTickRef.current < TWIN_CAPTURE_GUIDE.updateIntervalMs) return;
      lastTickRef.current = now;

      const accel = event.accelerationIncludingGravity ?? event.acceleration;
      if (accel && accel.x !== null && accel.y !== null && accel.z !== null) {
        pushSample(
          accelSamplesRef.current,
          Math.hypot(accel.x, accel.y, accel.z),
          TWIN_CAPTURE_GUIDE.windowSamples,
        );
      }

      const rate = event.rotationRate;
      if (rate && rate.alpha !== null && rate.beta !== null && rate.gamma !== null) {
        pushSample(
          gyroSamplesRef.current,
          Math.hypot(rate.alpha, rate.beta, rate.gamma),
          TWIN_CAPTURE_GUIDE.windowSamples,
        );
      }

      const pace = computeVariance(accelSamplesRef.current);
      const stability = computeVariance(gyroSamplesRef.current);
      setPaceVariance(pace);
      setStabilityVariance(stability);
      evaluateGuideState(pace, stability);
    };

    window.addEventListener("devicemotion", onMotion);
    return () => {
      active = false;
      window.removeEventListener("devicemotion", onMotion);
    };
  }, [
    commitGuideState,
    devPaceVarianceOverride,
    devStabilityVarianceOverride,
    evaluateGuideState,
    guideSensorsActive,
  ]);

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

  return {
    rollDeg,
    orientationSupported,
    levelLineActive,
    lastOrientationEventAt,
    guideState,
    paceVariance,
    stabilityVariance,
    permission,
    requestPermission,
  };
}
