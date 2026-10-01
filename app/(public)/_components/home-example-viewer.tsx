"use client";

import { useEffect, useRef, useState } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";
import { X } from "lucide-react";
import { buildDemoPanorama } from "@/app/(public)/_components/home-demo-panorama";

const STOPS = [
  { id: "start", label: "Start" },
  { id: "path", label: "Along the path" },
  { id: "turn", label: "At the turn" },
] as const;

const RAIL = [
  { id: "item", label: "Open item", body: "A punch stays on the view you had open." },
  { id: "sheet", label: "Pinned sheet", body: "The drawing sits with that spot in the walk." },
  { id: "question", label: "Question", body: "A client can ask from the same link." },
] as const;

export function HomeExampleViewer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const loadedRef = useRef("");
  const [frames, setFrames] = useState<string[]>([]);
  const [stop, setStop] = useState(0);
  const [note, setNote] = useState<(typeof RAIL)[number]["id"]>("item");
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFrames(STOPS.map((_, index) => buildDemoPanorama(index)));
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const first = frames[0];
    if (!host || !first || viewerRef.current) return;
    const viewer = new Viewer({
      container: host,
      panorama: first,
      navbar: false,
      defaultZoomLvl: 45,
      minFov: 40,
      maxFov: 90,
      mousewheel: false,
      touchmoveTwoFingers: false,
      keyboard: false,
      loadingTxt: "",
    });
    loadedRef.current = first;
    viewerRef.current = viewer;
    viewer.addEventListener("ready", () => setReady(true), { once: true });
    return () => {
      viewer.destroy();
      viewerRef.current = null;
      setReady(false);
    };
  }, [frames]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const src = frames[stop];
    if (!viewer || !ready || !src || loadedRef.current === src) return;
    loadedRef.current = src;
    void viewer.setPanorama(src, { showLoader: false, transition: { speed: 280, rotation: false } });
  }, [frames, ready, stop]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
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

  const activeNote = RAIL.find((row) => row.id === note) ?? RAIL[0];

  return (
    <div
      id="walk"
      className={
        expanded
          ? "fixed inset-0 z-[80] flex flex-col bg-[var(--mkt-canvas)]"
          : "overflow-hidden rounded-2xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)] shadow-[0_18px_40px_-28px_rgba(26,36,51,0.28)]"
      }
      style={
        expanded
          ? { paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--mkt-line)] px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--mkt-accent)]">Directed walk</p>
          <p className="truncate text-[14px] font-medium text-[var(--mkt-ink)]">Drag to look. Move by stop.</p>
        </div>
        {expanded ? (
          <button type="button" onClick={() => setExpanded(false)} className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-[10px] border border-[var(--mkt-line)] bg-[var(--mkt-surface)] px-3.5 text-[14px] font-semibold text-[var(--mkt-ink)]">
            <X className="h-4 w-4" aria-hidden />
            Close
          </button>
        ) : (
          <button type="button" onClick={() => setExpanded(true)} className="inline-flex h-11 shrink-0 items-center rounded-[10px] bg-[var(--mkt-accent)] px-3.5 text-[13px] font-semibold text-white">
            Open larger
          </button>
        )}
      </div>

      <div
        className={
          expanded
            ? "grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_240px] lg:grid-rows-1"
            : "grid lg:grid-cols-[minmax(0,1fr)_230px]"
        }
      >
        <div className={expanded ? "relative min-h-0" : "relative aspect-video min-h-[220px] w-full"}>
          <div ref={hostRef} className="absolute inset-0" data-testid="home-example-sphere" />
        </div>
        <aside className="border-t border-[var(--mkt-line)] bg-[var(--mkt-canvas)] p-3 lg:border-l lg:border-t-0">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--mkt-ink-muted)] ${expanded ? "max-lg:sr-only" : ""}`}>
            On the same record
          </p>
          <div className={`grid gap-1.5 ${expanded ? "max-lg:grid-cols-3 lg:mt-2" : "mt-2"}`}>
            {RAIL.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setNote(row.id)}
                className={`rounded-[9px] px-3 py-2 text-left ${row.id === note ? "bg-[var(--mkt-accent-soft)] text-[var(--mkt-ink)]" : "text-[var(--mkt-ink-muted)] hover:bg-[var(--mkt-canvas-alt)]"}`}
              >
                <span className="block text-[13.5px] font-semibold">{row.label}</span>
              </button>
            ))}
          </div>
          <p className={`mt-3 text-[13px] leading-relaxed text-[var(--mkt-ink-muted)] ${expanded ? "max-lg:hidden" : ""}`}>{activeNote.body}</p>
        </aside>
      </div>

      <div className="flex gap-2 overflow-x-auto border-t border-[var(--mkt-line)] px-3 py-2 sm:px-4" role="tablist" aria-label="Walk stops">
        {STOPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={index === stop}
            onClick={() => setStop(index)}
            className={`h-11 shrink-0 rounded-[9px] px-3.5 text-[13px] font-semibold ${index === stop ? "bg-[var(--mkt-accent)] text-white" : "border border-[var(--mkt-line)] bg-[var(--mkt-surface)] text-[var(--mkt-ink)]"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
