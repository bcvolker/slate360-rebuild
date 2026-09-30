"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  CAPSULE_RADIUS_M,
  KITCHEN_EYE_HEIGHT_WALK_M,
  walkDelta,
} from "@/lib/digital-twin/kitchen-capsule";
import { clampPitch, wrapYaw } from "@/lib/digital-twin/walkthrough-navigation";

export type LocoPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

export type KitchenLocomotion = {
  poseRef: React.MutableRefObject<LocoPose>;
  keysRef: React.MutableRefObject<{ f: number; r: number }>;
  targetRef: React.MutableRefObject<{ x: number; z: number } | null>;
  setPose: (pose: LocoPose) => void;
  reset: () => void;
  handleLook: (dx: number, dy: number) => void;
  walkTo: (x: number, z: number) => void;
};

export function useKitchenLocomotion(initial: LocoPose): KitchenLocomotion {
  const poseRef = useRef<LocoPose>({ ...initial });
  const keysRef = useRef({ f: 0, r: 0 });
  const targetRef = useRef<{ x: number; z: number } | null>(null);
  const homeRef = useRef<LocoPose>({ ...initial });

  const setPose = useCallback((pose: LocoPose) => {
    poseRef.current = pose;
  }, []);

  const reset = useCallback(() => {
    targetRef.current = null;
    poseRef.current = { ...homeRef.current };
  }, []);

  const walkTo = useCallback((x: number, z: number) => {
    targetRef.current = { x, z };
  }, []);

  const handleLook = useCallback((dx: number, dy: number) => {
    const pose = poseRef.current;
    poseRef.current = {
      ...pose,
      yaw: wrapYaw(pose.yaw + dx * 0.005),
      pitch: clampPitch(pose.pitch + dy * 0.005),
    };
  }, []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "KeyW" || e.code === "ArrowUp") keysRef.current.f = 1;
      if (e.code === "KeyS" || e.code === "ArrowDown") keysRef.current.f = -1;
      if (e.code === "KeyD" || e.code === "ArrowRight") keysRef.current.r = 1;
      if (e.code === "KeyA" || e.code === "ArrowLeft") keysRef.current.r = -1;
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") keysRef.current.f = 0;
      if (e.code === "KeyS" || e.code === "ArrowDown") keysRef.current.f = 0;
      if (e.code === "KeyD" || e.code === "ArrowRight") keysRef.current.r = 0;
      if (e.code === "KeyA" || e.code === "ArrowLeft") keysRef.current.r = 0;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  return { poseRef, keysRef, targetRef, setPose, reset, handleLook, walkTo };
}

export { CAPSULE_RADIUS_M, KITCHEN_EYE_HEIGHT_WALK_M, walkDelta };
