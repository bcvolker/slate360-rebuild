"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { useViewerGestures } from "@/components/digital-twin/use-viewer-gestures";
import { type MetricHit } from "@/components/digital-twin/walkthrough-rig";
import { useHybridMeasureTool } from "@/hooks/useHybridMeasureTool";
import { useKitchenLocomotion } from "@/hooks/useKitchenLocomotion";
import { useWalkthroughNavigation } from "@/hooks/useWalkthroughNavigation";
import {
  KITCHEN_CEILING_CUT_Y,
  KITCHEN_DEFAULT_STATION,
  KITCHEN_FLOORS,
  KITCHEN_HUMAN_FOV,
  KITCHEN_STATIONS,
  kitchenDefaultStation,
  kitchenEyeY,
} from "@/lib/digital-twin/kitchen-proof-world";

export function useKitchenProofShell() {
  const home = kitchenDefaultStation();
  const loco = useKitchenLocomotion({
    x: home.position[0],
    y: kitchenEyeY(),
    z: home.position[2],
    yaw: home.headingY ?? 0,
    pitch: 0,
  });
  const raycastRef = useRef<((x: number, y: number) => [number, number, number] | null) | null>(null);
  const metricRef = useRef<((x: number, y: number) => MetricHit | null) | null>(null);
  const [walkEnabled, setWalkEnabled] = useState(true);
  const [hoverWalk, setHoverWalk] = useState(false);
  const [hint, setHint] = useState(true);
  const [wantMeasure, setWantMeasure] = useState(false);
  const nav = useWalkthroughNavigation({
    stations: KITCHEN_STATIONS,
    floors: KITCHEN_FLOORS,
    ceilingCutY: KITCHEN_CEILING_CUT_Y,
    initialStationId: KITCHEN_DEFAULT_STATION,
    initialMode: "inside",
    raycastFloor: (x, y) => raycastRef.current?.(x, y) ?? null,
  });
  const measure = useHybridMeasureTool({
    persistKey: "kitchen-proof:m",
    epochId: "kitchen",
    modelId: null,
    spaceId: null,
    metricAvailable: true,
  });

  const goStation = useCallback(
    (id: string) => {
      const station = KITCHEN_STATIONS.find((s) => s.id === id);
      if (!station) return;
      loco.targetRef.current = null;
      loco.setPose({
        x: station.position[0],
        y: kitchenEyeY(),
        z: station.position[2],
        yaw: station.headingY ?? loco.poseRef.current.yaw,
        pitch: 0,
      });
      nav.goToStationId(id);
    },
    [loco, nav],
  );

  const consumeTap = useCallback(
    (x: number, y: number) => {
      setHint(false);
      if (measure.active) {
        const hit = metricRef.current?.(x, y);
        if (hit) measure.addPoint(hit.point);
        return true;
      }
      if (nav.mode !== "inside" || !walkEnabled) return false;
      const hit = raycastRef.current?.(x, y);
      if (hit) loco.walkTo(hit[0], hit[2]);
      return true;
    },
    [loco, measure, nav.mode, walkEnabled],
  );

  const patchedNav = useMemo(
    () => ({
      ...nav,
      handleLookDrag: (dx: number, dy: number) => {
        setHint(false);
        nav.handleLookDrag(dx, dy);
        if (nav.mode === "inside") loco.handleLook(dx, dy);
      },
    }),
    [nav, loco],
  );

  const gestures = useViewerGestures(patchedNav, {
    consumeTap,
    onHover: (x, y) => {
      measure.setHover(metricRef.current?.(x, y)?.point ?? null);
      setHoverWalk(Boolean(walkEnabled && !measure.active && raycastRef.current?.(x, y)));
    },
  });

  return {
    loco,
    nav,
    measure,
    goStation,
    walkEnabled,
    setWalkEnabled,
    hoverWalk,
    hint,
    setHint,
    wantMeasure,
    setWantMeasure,
    raycastRef,
    metricRef,
    gestures,
    humanFov: KITCHEN_HUMAN_FOV,
    stations: KITCHEN_STATIONS,
    defaultStation: KITCHEN_DEFAULT_STATION,
  };
}
