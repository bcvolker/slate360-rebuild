"use client";

import { useEffect, useState } from "react";
import { ChevronsUp, Maximize, X } from "lucide-react";
import type { Room213View } from "@/lib/room213/edit-state";
import type { WalkInput } from "@/components/room213/walk-input";
import { WalkJoystick } from "@/components/room213/WalkJoystick";
import { useLockedDocument } from "@/components/room213/ui-hooks";

/** iPhone/iPad Safari that is not already running full screen from the home screen. */
function isIosBrowser(): boolean {
  const n = navigator as Navigator & { standalone?: boolean };
  const ios = /iPhone|iPad|iPod/.test(n.userAgent) || (n.platform === "MacIntel" && n.maxTouchPoints > 1);
  return ios && !n.standalone && !matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches;
}

/** Safari's bars are collapsed when the page is as tall as the screen's short side (landscape). */
function iosBarsHidden(): boolean {
  return window.innerHeight >= Math.min(screen.width, screen.height) - 30;
}

const EXIT =
  "absolute right-0 top-0 z-40 m-[max(0.75rem,env(safe-area-inset-top))] mr-[max(0.75rem,env(safe-area-inset-right))] flex min-h-[44px] items-center gap-1 rounded-xl bg-[var(--mkt-surface)] px-3 text-[13px] font-semibold text-[var(--mkt-ink)] shadow-md";

/**
 * Landscape on a phone = the navigation mode: full screen, two thumbs (left joystick moves, right joystick looks),
 * and an X to leave full screen.
 * - Browsers with the Fullscreen API (Android Chrome…): full screen on the first touch after rotating (a gesture is
 *   required); X exits and stays out until the next rotation.
 * - iPhone Safari has no full-screen API for pages; its bars collapse when the PAGE is scrolled. So in landscape
 *   the document becomes scrollable behind the fixed viewer and a "Swipe up for full screen" layer takes one
 *   swipe; once the bars are gone the layer disappears and X (or "Not now") returns to normal.
 * The document is otherwise locked (no scroll, canvas-coloured) so nothing ever shows behind the viewer.
 */
export function LandscapeChrome({
  root,
  ready,
  view,
  coarse,
  landscape,
  sheetOpen,
  input,
  onActivity,
}: {
  root: HTMLElement | null;
  /** Model on screen: only then do the sticks / full-screen invitation appear (the document is locked always). */
  ready: boolean;
  view: Room213View;
  coarse: boolean;
  landscape: boolean;
  sheetOpen: boolean;
  input: WalkInput;
  onActivity: () => void;
}) {
  const active = coarse && landscape && ready;
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(false); // iOS: "Not now" / X — for this landscape session
  const [full, setFull] = useState(false);
  useEffect(() => setIos(isIosBrowser()), []);
  useEffect(() => {
    if (!active) setDismissed(false);
  }, [active]);

  const iosMode = ios && active && !dismissed;
  useLockedDocument(!iosMode);

  // Track full-screen state (both mechanisms).
  useEffect(() => {
    const update = () => setFull(ios ? active && iosBarsHidden() : Boolean(document.fullscreenElement));
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    document.addEventListener("fullscreenchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      document.removeEventListener("fullscreenchange", update);
    };
  }, [ios, active]);

  // Fullscreen API: enter on the first touch in landscape (unless the user left it), exit on rotating to portrait.
  useEffect(() => {
    if (ios || !root || !document.fullscreenEnabled || typeof root.requestFullscreen !== "function") return;
    if (!active) {
      if (document.fullscreenElement === root) void document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (dismissed) return;
    const onTouch = () => {
      if (!document.fullscreenElement) void root.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
    };
    root.addEventListener("pointerdown", onTouch, { capture: true });
    return () => root.removeEventListener("pointerdown", onTouch, { capture: true });
  }, [ios, root, active, dismissed]);

  const enter = () => {
    setDismissed(false); // iPhone: brings back the swipe-up layer (a page cannot hide Safari's bars itself)
    if (!ios && root && !document.fullscreenElement) void root.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
  };
  const isFull = ios ? full && !dismissed : full;
  const exit = () => {
    setDismissed(true);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    window.scrollTo(0, 0);
  };

  const walkSticks = view === "walk" && active && !sheetOpen;
  return (
    <>
      {walkSticks ? (
        <>
          <WalkJoystick input={input} onActivity={onActivity} kind="move" />
          <WalkJoystick input={input} onActivity={onActivity} kind="look" />
        </>
      ) : null}
      {active && !sheetOpen && !(iosMode && !full) ? (
        <button type="button" data-r213-ui onClick={isFull ? exit : enter} className={EXIT} aria-label={isFull ? "Exit full screen" : "Full screen"}>
          {isFull ? <X className="size-4" aria-hidden /> : <Maximize className="size-4" aria-hidden />}
          {isFull ? "Exit full screen" : "Full screen"}
        </button>
      ) : null}
      {iosMode && !full ? (
        <div
          data-r213-ui
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-[color-mix(in_srgb,var(--graphite-canvas)_62%,transparent)] text-[var(--mkt-surface)]"
          style={{ touchAction: "pan-y" }}
        >
          <ChevronsUp className="size-9 animate-bounce" aria-hidden />
          <p className="text-[16px] font-semibold">Swipe up for full screen</p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="mt-1 min-h-[44px] rounded-xl px-4 text-[13px] font-semibold text-[var(--mkt-surface)] underline underline-offset-4"
          >
            Not now
          </button>
        </div>
      ) : null}
    </>
  );
}
