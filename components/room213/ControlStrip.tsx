"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { Room213View } from "@/lib/room213/edit-state";
import { ROOM213_PINS } from "@/lib/room213/pins";

const PRIMARY =
  "min-h-[44px] min-w-[76px] px-4 text-[13px] font-semibold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--mkt-brand-green)]";
const ITEM =
  "flex min-h-[44px] w-full items-center justify-between gap-6 rounded-lg px-3 text-left text-[14px] text-[var(--mkt-ink)] hover:bg-[var(--mkt-canvas-alt)] focus-visible:bg-[var(--mkt-canvas-alt)] focus-visible:outline-none";

/**
 * Customer controls: Dollhouse | Walk | •••. After inactivity the strip only de-emphasises (labels stay readable,
 * targets stay live — the first tap does its job). One flat overflow menu; only relevant items appear.
 */
export function ControlStrip({
  view,
  quiet,
  menuOpen,
  onMenu,
  onView,
  ceilingHidden,
  onCeiling,
  onRoomInfo,
  onReset,
  root,
  onActivity,
  sheetOpen = false,
}: {
  view: Room213View;
  quiet: boolean;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  onView: (v: Room213View) => void;
  ceilingHidden: boolean;
  onCeiling: (hidden: boolean) => void;
  onRoomInfo: () => void;
  onReset: () => void;
  root: HTMLElement | null;
  onActivity: () => void;
  /** A content sheet is open: in landscape / wide layouts it docks right, so centre the strip in the room area. */
  sheetOpen?: boolean;
}) {
  const [fsSupported, setFsSupported] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [focusWithin, setFocusWithin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastView = useRef<Room213View>("dollhouse");
  if (view !== "plan") lastView.current = view;

  useEffect(() => {
    setFsSupported(Boolean(document.fullscreenEnabled && root?.requestFullscreen));
    const on = () => setIsFs(document.fullscreenElement === root);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, [root]);

  useEffect(() => {
    if (menuOpen) menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [menuOpen]);

  const share = async () => {
    onMenu(false);
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) await navigator.share({ title: "Payne Hall — Room 213", text: "Interactive Spatial Capture", url });
      else {
        await navigator.clipboard.writeText(url);
        setToast("Link copied");
        window.setTimeout(() => setToast(null), 1800);
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  const emphasised = !quiet || menuOpen || focusWithin;
  return (
    <div
      className={`absolute inset-x-0 z-30 flex flex-col items-center gap-2 ${sheetOpen ? "landscape:right-[min(42%,380px)] sm:right-[min(42%,380px)]" : ""}`}
      style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocusWithin(false)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onActivity();
      }}
    >
      {menuOpen ? (
        <div ref={menuRef} role="menu" aria-label="More" className="w-[min(86vw,260px)] rounded-xl bg-[var(--mkt-surface)] p-1.5 shadow-lg">
          <button type="button" role="menuitemcheckbox" aria-checked={view === "plan"} className={ITEM} onClick={() => onView(view === "plan" ? lastView.current : "plan")}>
            Plan view {view === "plan" ? <Check className="size-4 text-[var(--mkt-brand-green)]" aria-hidden /> : null}
          </button>
          {view === "walk" ? (
            <button type="button" role="menuitemcheckbox" aria-checked={!ceilingHidden} className={ITEM} onClick={() => onCeiling(!ceilingHidden)}>
              Ceiling {!ceilingHidden ? <Check className="size-4 text-[var(--mkt-brand-green)]" aria-hidden /> : null}
            </button>
          ) : null}
          <button type="button" role="menuitem" className={ITEM} onClick={onRoomInfo}>
            Room information <span className="text-[12px] text-[var(--mkt-ink-muted)]">{ROOM213_PINS.length} items</span>
          </button>
          <button type="button" role="menuitem" className={ITEM} onClick={onReset}>Reset view</button>
          {fsSupported ? (
            <button type="button" role="menuitem" className={ITEM} onClick={() => (onMenu(false), isFs ? void document.exitFullscreen() : void root?.requestFullscreen())}>
              {isFs ? "Exit full screen" : "Full screen"}
            </button>
          ) : null}
          <button type="button" role="menuitem" className={ITEM} onClick={() => void share()}>Share</button>
        </div>
      ) : null}
      {toast ? <p role="status" className="rounded-md bg-[var(--mkt-surface)] px-3 py-1 text-[12px] text-[var(--mkt-ink)]">{toast}</p> : null}
      <div
        className={`flex overflow-hidden rounded-xl bg-[var(--mkt-surface)] shadow-md transition-opacity duration-500 ${emphasised ? "opacity-100" : "opacity-60"}`}
        role="toolbar"
        aria-label="View"
      >
        {(["dollhouse", "walk"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => onView(v)}
            className={`${PRIMARY} ${view === v ? "bg-[var(--mkt-brand-green)] text-[var(--mkt-surface)]" : "text-[var(--mkt-ink)] hover:bg-[var(--mkt-canvas-alt)]"}`}
          >
            {v === "dollhouse" ? "Dollhouse" : "Walk"}
          </button>
        ))}
        <button
          type="button"
          aria-label="More"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => onMenu(!menuOpen)}
          className={`${PRIMARY} min-w-[52px] border-l border-[var(--mkt-line)] text-[18px] leading-none ${menuOpen ? "bg-[var(--mkt-canvas-alt)]" : ""} text-[var(--mkt-ink)] hover:bg-[var(--mkt-canvas-alt)]`}
        >
          •••
        </button>
      </div>
    </div>
  );
}
