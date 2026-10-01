"use client";

import { useEffect, useRef, useState } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";
import { X } from "lucide-react";

/**
 * Directed 360 stills from the in-repo AOB205 preview fixture
 * (public/preview/aob205/stations, 2:1 equirects). The stitched walk
 * proxy is gitignored, so this does not invent a /w token.
 */
const STOPS = [
  { id: "entry", label: "Entry", src: "/preview/aob205/stations/s01.jpg" },
  { id: "room", label: "Room", src: "/preview/aob205/stations/s03.jpg" },
  { id: "front", label: "Front of room", src: "/preview/aob205/stations/s07.jpg" },
  { id: "door", label: "Far door", src: "/preview/aob205/stations/s08.jpg" },
] as const;

export function HomeExampleViewer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const loadedRef = useRef<string>(STOPS[0].src);
  const [stop, setStop] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const viewer = new Viewer({
      container: host,
      panorama: STOPS[0].src,
      navbar: false,
      defaultZoomLvl: 40,
      minFov: 40,
      maxFov: 90,
      mousewheel: false,
      touchmoveTwoFingers: false,
      keyboard: false,
      loadingTxt: "Loading the walk…",
    });
    viewerRef.current = viewer;
    viewer.addEventListener("ready", () => setReady(true), { once: true });
    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    const src = STOPS[stop].src;
    if (!viewer || !ready || loadedRef.current === src) return;
    loadedRef.current = src;
    void viewer.setPanorama(src, {
      showLoader: false,
      transition: { speed: 400, rotation: false },
    });
  }, [stop, ready]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ready) return;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => viewer.autoSize());
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, [expanded, ready]);

  return (
    <div
      id="example"
      className={
        expanded
          ? "fixed inset-0 z-[80] flex flex-col bg-[var(--mkt-canvas)]"
          : "overflow-hidden rounded-2xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)] shadow-[0_18px_40px_-28px_rgba(26,36,51,0.35)]"
      }
      style={
        expanded
          ? {
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--mkt-line)] px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--mkt-accent)]">
            Interactive example
          </p>
          <p className="truncate text-[14px] font-medium text-[var(--mkt-ink)]">Directed 360 walkthrough</p>
        </div>
        {expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-[10px] border border-[var(--mkt-line)] bg-[var(--mkt-surface)] px-3.5 text-[14px] font-semibold text-[var(--mkt-ink)]"
          >
            <X className="h-4 w-4" aria-hidden />
            Close
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex h-11 shrink-0 items-center rounded-[10px] bg-[var(--mkt-accent)] px-3.5 text-[13px] font-semibold text-white"
          >
            Open larger
          </button>
        )}
      </div>

      <div className={expanded ? "relative min-h-0 w-full flex-1" : "relative aspect-video w-full min-h-[220px]"}>
        <div ref={hostRef} className="absolute inset-0" data-testid="home-example-sphere" />
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-[8px] bg-[var(--mkt-surface)]/90 px-2.5 py-1 text-[12px] font-medium text-[var(--mkt-ink)]">
          Drag to look around
        </p>
      </div>

      <div
        className="flex gap-2 overflow-x-auto border-t border-[var(--mkt-line)] px-3 py-2 sm:px-4"
        role="tablist"
        aria-label="Walk stops"
      >
        {STOPS.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={i === stop}
            onClick={() => setStop(i)}
            className={`h-11 shrink-0 rounded-[9px] px-3.5 text-[13px] font-semibold ${
              i === stop
                ? "bg-[var(--mkt-accent)] text-white"
                : "border border-[var(--mkt-line)] bg-[var(--mkt-surface)] text-[var(--mkt-ink)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
