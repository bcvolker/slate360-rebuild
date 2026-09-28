"use client";

import { useEffect, useState } from "react";
import { Maximize, X } from "lucide-react";
import type { Room213View } from "@/lib/room213/edit-state";
import type { WalkInput } from "@/components/room213/walk-input";
import { WalkJoystick } from "@/components/room213/WalkJoystick";
import { useLockedDocument } from "@/components/room213/ui-hooks";

/** Browsers that let a page go full screen (Android Chrome, desktop, iPad Safari). iPhone Safari does not. */
function canFullscreen(root: HTMLElement | null): boolean {
  return Boolean(root && document.fullscreenEnabled && typeof root.requestFullscreen === "function");
}

/** Already launched full screen from the home screen (no browser bars to hide). */
function isStandalone(): boolean {
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone) || matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches;
}

const noop = () => {};

const CHIP =
  "absolute right-0 top-0 z-40 m-[max(0.75rem,env(safe-area-inset-top))] mr-[max(0.75rem,env(safe-area-inset-right))] flex min-h-[44px] items-center gap-1 rounded-xl bg-[var(--mkt-surface)] px-3 text-[13px] font-semibold text-[var(--mkt-ink)] shadow-md";

/**
 * Landscape on a phone = the navigation mode: two thumbs (left joystick moves, right joystick looks) and a
 * Full screen / Exit full screen toggle.
 * - Where the browser allows it (Fullscreen API): the viewer goes full screen on the first touch after rotating
 *   or on the toggle; Exit leaves it until the next rotation.
 * - iPhone Safari has no full-screen capability for web pages (Apple allows it only for video), so no button is
 *   shown there (it could do nothing). Launching from the home screen (this route's manifest) is full screen.
 * The document behind the viewer is always locked (no scroll, canvas-coloured).
 */
export function LandscapeChrome({
  root,
  ready,
  view,
  coarse,
  landscape,
  sheetOpen,
  input,
}: {
  root: HTMLElement | null;
  /** Model on screen: only then do the sticks / full-screen toggle appear. */
  ready: boolean;
  view: Room213View;
  coarse: boolean;
  landscape: boolean;
  sheetOpen: boolean;
  input: WalkInput;
  onActivity?: () => void;
}) {
  useLockedDocument();
  const active = coarse && landscape && ready;
  const [supported, setSupported] = useState(false);
  const [full, setFull] = useState(false);
  const [userExited, setUserExited] = useState(false);
  const [standalone, setStandalone] = useState(false);
  useEffect(() => setSupported(canFullscreen(root)), [root]);
  useEffect(() => setStandalone(isStandalone()), []);
  useEffect(() => {
    if (!active) {
      setUserExited(false);
    }
  }, [active]);

  useEffect(() => {
    const update = () => setFull(Boolean(document.fullscreenElement));
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  // Enter on the first touch in landscape (browsers require a gesture), unless the user left it; exit in portrait.
  useEffect(() => {
    if (!supported || !root) return;
    if (!active) {
      if (document.fullscreenElement === root) void document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (userExited) return;
    const onTouch = () => {
      if (!document.fullscreenElement) void root.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
    };
    root.addEventListener("pointerdown", onTouch, { capture: true });
    return () => root.removeEventListener("pointerdown", onTouch, { capture: true });
  }, [supported, root, active, userExited]);

  const toggle = () => {
    if (!supported) return;
    if (document.fullscreenElement) {
      setUserExited(true);
      void document.exitFullscreen().catch(() => undefined);
    } else {
      setUserExited(false);
      void root?.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
    }
  };

  const walkSticks = view === "walk" && active && !sheetOpen;
  return (
    <>
      {walkSticks ? (
        <>
          {/* Driving the sticks must not bring the tucked control strip back over the view. */}
          <WalkJoystick input={input} onActivity={noop} kind="move" />
          <WalkJoystick input={input} onActivity={noop} kind="look" />
        </>
      ) : null}
      {active && supported && !sheetOpen && !standalone ? (
        <button type="button" data-r213-ui onClick={toggle} className={CHIP} aria-label={full ? "Exit full screen" : "Full screen"}>
          {full ? <X className="size-4" aria-hidden /> : <Maximize className="size-4" aria-hidden />}
          {full ? "Exit full screen" : "Full screen"}
        </button>
      ) : null}
    </>
  );
}
