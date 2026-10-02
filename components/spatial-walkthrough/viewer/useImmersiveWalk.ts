"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  enterWalkImmersive,
  isWalkImmersive,
  leaveWalkImmersive,
  subscribeFullscreenChange,
  syncImmersiveApiExit,
  syncVisualViewport,
  IMMERSIVE_ATTR,
} from "@/lib/spatial-walkthrough/fullscreen";
import {
  shouldExitImmersiveOnPortrait,
  showLandscapeJoystickHud,
  type ViewportSnap,
} from "@/lib/spatial-walkthrough/landscape-viewport";

function frameEl(): HTMLElement | null {
  return document.querySelector(".sw-frame");
}

function readViewportSnap(): ViewportSnap {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const type = window.screen?.orientation?.type ?? "";
  let orientation: ViewportSnap["orientation"] = null;
  if (type.startsWith("landscape")) orientation = "landscape";
  else if (type.startsWith("portrait")) orientation = "portrait";
  else if (window.matchMedia("(orientation: landscape)").matches) orientation = "landscape";
  else if (window.matchMedia("(orientation: portrait)").matches) orientation = "portrait";
  return {
    width,
    height,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    orientation,
  };
}

/**
 * Landscape HUD visibility plus fullscreen for `.sw-frame`.
 * Entering landscape on a touch device offers fullscreen. A held pointer at
 * the moment of rotation tries to enter (the API still needs a user gesture;
 * a rejection falls back to the CSS immersive frame). Portrait on a phone or
 * tablet exits so the overlay cannot stick.
 */
export function useImmersiveWalk() {
  const [showHud, setShowHud] = useState(false);
  const [active, setActive] = useState(false);
  const [offer, setOffer] = useState(false);
  const wasLandscape = useRef(false);
  const pointerDown = useRef(false);

  const enter = useCallback(() => {
    const el = frameEl();
    if (!el) return Promise.resolve();
    return enterWalkImmersive(el).then(() => {
      setOffer(false);
      setActive(isWalkImmersive(el));
    });
  }, []);

  const exit = useCallback(() => {
    const el = frameEl();
    return leaveWalkImmersive(el).then(() => {
      setOffer(false);
      setActive(false);
    });
  }, []);

  const toggle = useCallback(() => {
    const el = frameEl();
    if (el && isWalkImmersive(el)) return exit();
    return enter();
  }, [enter, exit]);

  useEffect(() => {
    const onPointerDown = () => {
      pointerDown.current = true;
    };
    const onPointerUp = () => {
      pointerDown.current = false;
    };

    const onViewport = () => {
      const snap = readViewportSnap();
      const landscape = showLandscapeJoystickHud(snap);
      const enteredLandscape = landscape && !wasLandscape.current;
      wasLandscape.current = landscape;
      setShowHud(landscape);
      const el = frameEl();
      if (el?.getAttribute(IMMERSIVE_ATTR) === "pseudo") syncVisualViewport(el);
      if (el && shouldExitImmersiveOnPortrait(snap) && isWalkImmersive(el)) {
        void leaveWalkImmersive(el).then(() => {
          setActive(false);
          setOffer(false);
        });
        return;
      }
      if (enteredLandscape && el && !isWalkImmersive(el)) {
        if (pointerDown.current) void enter();
        else setOffer(true);
      }
      setActive(el ? isWalkImmersive(el) : false);
    };

    const onFullscreen = () => {
      const el = frameEl();
      syncImmersiveApiExit(el);
      setActive(el ? isWalkImmersive(el) : false);
    };

    const onVisual = () => {
      const el = frameEl();
      if (el?.getAttribute(IMMERSIVE_ATTR) === "pseudo") syncVisualViewport(el);
    };

    onViewport();
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);
    window.addEventListener("resize", onViewport);
    window.addEventListener("orientationchange", onViewport);
    const orientationMq = window.matchMedia("(orientation: landscape)");
    orientationMq.addEventListener?.("change", onViewport);
    window.screen?.orientation?.addEventListener?.("change", onViewport);
    const detachFs = subscribeFullscreenChange(document, onFullscreen);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onVisual);
    vv?.addEventListener("scroll", onVisual);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
      window.removeEventListener("resize", onViewport);
      window.removeEventListener("orientationchange", onViewport);
      orientationMq.removeEventListener?.("change", onViewport);
      window.screen?.orientation?.removeEventListener?.("change", onViewport);
      vv?.removeEventListener("resize", onVisual);
      vv?.removeEventListener("scroll", onVisual);
      detachFs();
      const el = frameEl();
      if (el && isWalkImmersive(el)) void leaveWalkImmersive(el);
    };
  }, [enter]);

  return { showHud, active, offer, enter, exit, toggle, dismissOffer: () => setOffer(false) };
}
