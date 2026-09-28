"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw, X } from "lucide-react";
import type { Room213View } from "@/lib/room213/edit-state";

function seen(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markSeen(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* storage blocked */
  }
}

/**
 * One-time, self-dismissing navigation hints (no modal): first Walk entry, then "rotate" once in portrait on
 * phones. A hint is marked seen only when it has actually been on screen and dismissed, so an interrupted
 * effect (StrictMode, quick view switch) never swallows it.
 */
export function NavHints({ view, coarse, landscape }: { view: Room213View; coarse: boolean; landscape: boolean }) {
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => {
    if (view === "plan") return;
    let key: string | null = null;
    let text: string | null = null;
    if (view === "dollhouse") {
      if (!seen("room213.hint.dollhouse")) {
        key = "room213.hint.dollhouse";
        text = coarse ? "Drag to turn · Pinch to zoom · Tap a plaque for details" : "Drag to turn · Scroll to zoom · Click a plaque for details";
      }
    } else if (!seen("room213.hint.walk")) {
      key = "room213.hint.walk";
      text = !coarse ? "Drag to look · Click the floor to move" : landscape ? "Drag to look · Joystick to move" : "Drag to look · Tap the floor to move";
    }
    if (!key || !text) return;
    setHint(text);
    const t = window.setTimeout(() => {
      markSeen(key);
      setHint(null);
    }, 3800);
    return () => {
      window.clearTimeout(t);
      setHint(null);
    };
  }, [view, coarse, landscape]);
  if (!hint) return null;
  return (
    <p role="status" className="pointer-events-none absolute inset-x-0 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-20 mx-auto w-fit rounded-lg bg-[color-mix(in_srgb,var(--graphite-canvas)_68%,transparent)] px-3 py-1.5 text-[12px] font-medium text-[var(--mkt-surface)]">
      {hint}
    </p>
  );
}

/**
 * Portrait phones: a small, closable tip in the top-right corner (below the identity badge, clear of the
 * controls and the model's centre) saying landscape has the joystick. It stays until closed or until the phone is
 * rotated; the first rotation after seeing it calls `onFirstLandscape` (the viewer enters Walk so the promised
 * joystick is actually there). Never shown again after either.
 */
export function LandscapeTip({ coarse, landscape, hidden, onFirstLandscape }: { coarse: boolean; landscape: boolean; hidden: boolean; onFirstLandscape: () => void }) {
  const [show, setShow] = useState(false);
  const cb = useRef(onFirstLandscape);
  cb.current = onFirstLandscape;
  useEffect(() => {
    if (!coarse || seen("room213.tip.landscape")) return setShow(false);
    if (landscape) {
      if (show) {
        markSeen("room213.tip.landscape");
        setShow(false);
        cb.current();
      }
      return;
    }
    setShow(true);
  }, [coarse, landscape, show]);
  if (!show || hidden) return null;
  return (
    <div className="absolute right-0 top-0 z-20 pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(7.25rem,calc(env(safe-area-inset-top)+6.5rem))]">
      <div className="flex max-w-[210px] items-center gap-1 rounded-lg bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] py-1 pl-2.5 pr-1 text-[11.5px] font-medium leading-snug text-[var(--mkt-surface)]">
        <RotateCw className="size-3.5 shrink-0" aria-hidden />
        <span>Turn sideways to walk with a joystick</span>
        <button
          type="button"
          aria-label="Dismiss tip"
          onClick={() => (markSeen("room213.tip.landscape"), setShow(false))}
          className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-white/10"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
