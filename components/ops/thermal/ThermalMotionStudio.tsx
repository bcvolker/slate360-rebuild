"use client";

import { useMemo, useState } from "react";
import type { StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";

type Mode = "timelapse" | "video";
type Aspect = "original" | "16:9" | "9:16" | "1:1" | "4:3" | "21:9";
type Smoothing = "none" | "interpolate" | "rife";
type Overlay = "clean" | "keep" | "animate";

const ASPECTS: Aspect[] = ["original", "16:9", "9:16", "1:1", "4:3", "21:9"];

/**
 * Motion studio — shared timeline UI for Time-lapse and Video. Add frames/clips from
 * the session (or SlateDrop) into a timeline, mass-select, set the length/smoothness,
 * choose an export aspect ratio, and decide whether measurement overlays are burned in
 * (clean), kept static, or animated. Heavy render runs in the cloud (Modal + ffmpeg);
 * this builds the edit spec and dispatches the job. No page scroll — contained regions.
 */
export function ThermalMotionStudio({
  sessionId,
  captures,
}: {
  sessionId: string;
  captures: StudioCapture[];
}) {
  const [mode, setMode] = useState<Mode>("timelapse");
  const [timeline, setTimeline] = useState<string[]>([]);
  const [sourceSel, setSourceSel] = useState<Set<string>>(new Set());
  const [tlSel, setTlSel] = useState<Set<string>>(new Set());
  const byId = useMemo(() => new Map(captures.map((c) => [c.id, c])), [captures]);

  // Export settings
  const [aspect, setAspect] = useState<Aspect>("16:9");
  const [fps, setFps] = useState(12);
  const [smoothing, setSmoothing] = useState<Smoothing>("interpolate");
  const [deflicker, setDeflicker] = useState(true);
  const [overlay, setOverlay] = useState<Overlay>("clean");
  const [retainRadiometric, setRetainRadiometric] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const durationSec = timeline.length && fps ? timeline.length / fps : 0;

  function addToTimeline(ids: string[]) {
    setTimeline((tl) => [...tl, ...ids.filter((id) => !tl.includes(id))]);
    setSourceSel(new Set());
  }
  function toggleSource(id: string) {
    setSourceSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleTl(id: string) {
    setTlSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function removeSelectedFromTimeline() {
    setTimeline((tl) => tl.filter((id) => !tlSel.has(id)));
    setTlSel(new Set());
  }
  function move(idx: number, dir: -1 | 1) {
    setTimeline((tl) => {
      const j = idx + dir;
      if (j < 0 || j >= tl.length) return tl;
      const n = [...tl];
      [n[idx], n[j]] = [n[j], n[idx]];
      return n;
    });
  }

  async function generate() {
    if (!timeline.length) return;
    setBusy(true); setErr(null); setNote(null);
    try {
      const res = await fetch("/api/ops/thermal/timelapse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          mode,
          frameIds: timeline,
          settings: { aspect, fps, smoothing, deflicker, overlay, retainRadiometric },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to start render");
      setNote("Queued — rendering in the cloud. It will appear in Deliver when ready.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Render failed");
    } finally {
      setBusy(false);
    }
  }

  const eyebrow = "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--graphite-muted)]";
  const seg = (on: boolean) =>
    `rounded-md px-2 py-1 text-[11px] font-medium ${on ? "bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-text-header)]" : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"}`;
  const field = "mt-1 block w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas-deep)] px-2 py-1 text-xs text-[var(--graphite-text-body)] [color-scheme:dark]";

  const preview = timeline.length ? byId.get(timeline[0]) : captures[0];

  return (
    <div className="flex h-full min-h-0 gap-2 p-2">
      {/* LEFT: source */}
      <aside className="flex w-56 shrink-0 flex-col gap-2 overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)] p-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMode("timelapse")} className={seg(mode === "timelapse")}>Time-lapse</button>
          <button type="button" onClick={() => setMode("video")} className={seg(mode === "video")}>Video</button>
        </div>
        <div className="flex items-center justify-between">
          <span className={eyebrow}>Source ({captures.length})</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => setSourceSel(new Set(captures.map((c) => c.id)))} className="text-[10px] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">All</button>
            <button type="button" onClick={() => addToTimeline(captures.map((c) => c.id))} className="text-[10px] font-semibold text-[var(--graphite-primary)]">+ Add all</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-1">
            {captures.map((c) => {
              const on = sourceSel.has(c.id);
              return (
                <button key={c.id} type="button" onClick={() => toggleSource(c.id)} title={c.filename}
                  className={`relative aspect-[4/3] overflow-hidden rounded border bg-[#111827] ${on ? "border-[var(--graphite-primary)] ring-1 ring-[var(--graphite-primary)]" : "border-[var(--mobile-app-card-border)]"}`}>
                  {c.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.previewUrl} alt={c.filename} className="h-full w-full object-cover" />
                  ) : <span className="flex h-full items-center justify-center px-0.5 text-center text-[7px] text-[var(--graphite-muted)]">{c.filename}</span>}
                  {on ? <span className="absolute right-0.5 top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--graphite-primary)] text-[8px] font-bold text-[var(--graphite-canvas)]">✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>
        {sourceSel.size ? (
          <button type="button" onClick={() => addToTimeline([...sourceSel])} className="rounded-lg bg-[var(--graphite-primary)] px-2 py-1.5 text-[11px] font-semibold text-[var(--graphite-canvas)]">
            Add {sourceSel.size} to timeline
          </button>
        ) : null}
      </aside>

      {/* CENTER: preview + timeline */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas-deep)] p-2">
          {preview?.previewUrl ? (
            <div className="relative flex h-full w-full items-center justify-center">
              {/* aspect-ratio framing guide */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.previewUrl} alt="preview" className="max-h-full max-w-full rounded object-contain" />
              <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                {mode === "timelapse" ? "Time-lapse" : "Video"} · {aspect} · {durationSec ? `${durationSec.toFixed(1)}s @ ${fps}fps` : "add frames"}
              </span>
            </div>
          ) : (
            <p className="text-xs text-[var(--graphite-muted)]">Add frames from the source to preview.</p>
          )}
        </div>
        {/* Timeline dock */}
        <div className="shrink-0 rounded-xl border border-[var(--mobile-app-card-border)] p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className={eyebrow}>Timeline · {timeline.length} frame{timeline.length === 1 ? "" : "s"}</span>
            <div className="flex items-center gap-1.5">
              {tlSel.size ? (
                <button type="button" onClick={removeSelectedFromTimeline} className="rounded border border-[var(--mobile-app-card-border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--graphite-muted)] hover:text-[#fca5a5]">Remove {tlSel.size}</button>
              ) : null}
              {timeline.length ? (
                <button type="button" onClick={() => { setTimeline([]); setTlSel(new Set()); }} className="rounded border border-[var(--mobile-app-card-border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">Clear</button>
              ) : null}
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {timeline.length === 0 ? (
              <p className="py-3 text-[11px] text-[var(--graphite-muted)]">Add frames from the left, then set length & export options on the right.</p>
            ) : timeline.map((id, idx) => {
              const c = byId.get(id); if (!c) return null;
              const on = tlSel.has(id);
              return (
                <div key={id} className="group relative shrink-0">
                  <button type="button" onClick={() => toggleTl(id)} title={c.filename}
                    className={`relative block aspect-[4/3] h-16 overflow-hidden rounded border bg-[#111827] ${on ? "border-[var(--graphite-primary)] ring-1 ring-[var(--graphite-primary)]" : "border-[var(--mobile-app-card-border)]"}`}>
                    {c.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.previewUrl} alt={c.filename} className="h-full w-full object-cover" />
                    ) : null}
                    <span className="absolute left-0.5 top-0.5 rounded bg-black/60 px-1 text-[8px] font-bold text-white">{idx + 1}</span>
                  </button>
                  <div className="mt-0.5 flex justify-center gap-0.5">
                    <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="text-[10px] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => move(idx, 1)} disabled={idx === timeline.length - 1} className="text-[10px] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:opacity-30">↓</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* RIGHT: export settings */}
      <aside className="flex w-72 shrink-0 flex-col gap-2 overflow-y-auto pr-0.5">
        <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3 space-y-2.5">
          <p className="text-xs font-semibold text-[var(--graphite-text-header)]">Export</p>
          <label className="block text-[11px] text-[var(--graphite-muted)]">Aspect ratio
            <select value={aspect} onChange={(e) => setAspect(e.target.value as Aspect)} className={field}>
              {ASPECTS.map((a) => <option key={a} value={a}>{a === "original" ? "Original" : a}</option>)}
            </select>
          </label>
          {mode === "timelapse" ? (
            <label className="block text-[11px] text-[var(--graphite-muted)]">
              Speed · {fps} fps {durationSec ? `→ ${durationSec.toFixed(1)}s` : ""}
              <input type="range" min={1} max={30} value={fps} onChange={(e) => setFps(Number(e.target.value))} className="mt-1 w-full accent-[var(--graphite-primary)]" />
              <span className="text-[10px]">Lower = longer/slower · higher = shorter/faster</span>
            </label>
          ) : null}
          <label className="block text-[11px] text-[var(--graphite-muted)]">Smoothing
            <select value={smoothing} onChange={(e) => setSmoothing(e.target.value as Smoothing)} className={field}>
              <option value="none">None</option>
              <option value="interpolate">Motion interpolation (ffmpeg minterpolate)</option>
              <option value="rife">High quality (RIFE)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-[var(--graphite-text-body)]">
            <input type="checkbox" checked={deflicker} onChange={(e) => setDeflicker(e.target.checked)} className="accent-[var(--graphite-primary)]" />
            Deflicker (reduce thermal frame flicker)
          </label>
        </div>

        <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3 space-y-2">
          <p className="text-xs font-semibold text-[var(--graphite-text-header)]">Measurements overlay</p>
          <div className="flex flex-col gap-1">
            {([["clean", "Clean — no marks (raw thermal)"], ["keep", "Keep marks static"], ["animate", "Animate temperatures changing"]] as [Overlay, string][]).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2 text-[11px] text-[var(--graphite-text-body)]">
                <input type="radio" name="overlay" checked={overlay === v} onChange={() => setOverlay(v)} className="accent-[var(--graphite-primary)]" />
                {label}
              </label>
            ))}
          </div>
          <p className="text-[10px] text-[var(--graphite-muted)]">Applies to all frames; per-image marks are kept on the source either way.</p>
        </div>

        <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3 space-y-2">
          <label className="flex items-center gap-2 text-[11px] text-[var(--graphite-text-body)]">
            <input type="checkbox" checked={retainRadiometric} onChange={(e) => setRetainRadiometric(e.target.checked)} className="accent-[var(--graphite-primary)]" />
            Also retain radiometric stack (scrub/probe later)
          </label>
          <button type="button" disabled={busy || !timeline.length} onClick={generate}
            className="w-full rounded-lg bg-[var(--graphite-primary)] px-3 py-2 text-sm font-semibold text-[var(--graphite-canvas)] disabled:opacity-50">
            {busy ? "Queuing…" : `Render ${mode === "timelapse" ? "time-lapse" : "video"} → MP4`}
          </button>
          {note ? <p className="text-[11px] text-[var(--graphite-muted)]">{note}</p> : null}
          {err ? <p className="text-[11px] text-[#fca5a5]">{err}</p> : null}
        </div>
      </aside>
    </div>
  );
}
