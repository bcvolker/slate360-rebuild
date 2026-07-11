"use client";

import { useEffect, useState } from "react";
import { AnalyzeAccordion } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeAccordion";
import { MotionTimeRuler } from "@/components/thermal-studio-v2/panels/deliver/MotionTimeRuler";
import { dispatchMotionRender, type MotionMode, type MotionSettings } from "@/components/thermal-studio-v2/lib/motion-api";
import type { MotionRange } from "@/components/thermal-studio-v2/lib/useMotionState";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

const ASPECTS: MotionSettings["aspect"][] = ["original", "16:9", "9:16", "1:1", "4:3", "21:9"];

/**
 * S8-M Motion — full-canvas time-ruler editor (doc D4): image analysis is a
 * spatial paradigm, motion is a TIME one, so this deliberately takes over the
 * whole Deliver tab rather than living inside V2PanelFrame's rail layout.
 * Range + settings are CONTROLLED (owned by DeliverPanel via useMotionState)
 * so "← Deliver" keeps them instead of losing them to an unmount.
 */
export function MotionEditor({
  sessionId,
  captures,
  mode,
  range,
  onRangeChange,
  settings,
  onSettingsChange,
  onBack,
}: {
  sessionId: string;
  captures: ThermalV2Capture[];
  mode: MotionMode;
  range: MotionRange;
  onRangeChange: (next: MotionRange) => void;
  settings: MotionSettings;
  onSettingsChange: (next: MotionSettings) => void;
  onBack: () => void;
}) {
  const [openSection, setOpenSection] = useState("Output");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onBack();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  function toggle(section: string) {
    setOpenSection((prev) => (prev === section ? "" : section));
  }
  function updateSettings(patch: Partial<MotionSettings>) {
    onSettingsChange({ ...settings, ...patch });
  }

  const preview = captures[range.playheadIdx] ?? null;
  const frameCountInRange = range.outIdx - range.inIdx + 1;
  const durationSec = settings.fps ? frameCountInRange / settings.fps : 0;

  async function render() {
    const frameIds = captures.slice(range.inIdx, range.outIdx + 1).map((c) => c.id);
    if (!frameIds.length) return;
    setBusy(true);
    setStatus(null);
    const result = await dispatchMotionRender(sessionId, mode, frameIds, settings);
    setStatus("error" in result ? result.error : result.dispatched ? "Rendering in the cloud — the MP4 will appear in Deliver's Share link when ready." : "Saved — will render once the cloud worker is enabled for this environment.");
    setBusy(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--mobile-app-card-border)] px-3 py-2">
        <button type="button" onClick={onBack} className="text-xs font-semibold text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">
          ← Deliver
        </button>
        <span className="text-xs font-semibold text-[var(--graphite-text-header)]">{mode === "timelapse" ? "Timelapse Builder" : "Video Trim"}</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[var(--graphite-canvas-deep)] p-3">
            {preview?.previewUrl ? (
              <div className="relative flex h-full w-full items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.previewUrl} alt={preview.filename} className="max-h-full max-w-full rounded object-contain" />
                <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {settings.aspect} · {durationSec ? `${durationSec.toFixed(1)}s @ ${settings.fps}fps` : "no frames in range"}
                </span>
              </div>
            ) : (
              <p className="text-xs text-[var(--graphite-muted)]">No frames available.</p>
            )}
          </div>
          <div className="h-24 shrink-0 border-t border-[var(--mobile-app-card-border)]">
            <MotionTimeRuler
              frameCount={captures.length}
              range={range}
              onRangeChange={onRangeChange}
              filenames={captures.map((c) => c.filename)}
            />
          </div>
        </div>
        <div className="w-72 shrink-0 overflow-y-auto border-l border-[var(--mobile-app-card-border)] p-2">
          <AnalyzeAccordion title={mode === "timelapse" ? "Speed & duration" : "Playback speed"} open={openSection === "speed"} onToggle={() => toggle("speed")}>
            <label className="block text-[11px] text-[var(--graphite-muted)]">
              {settings.fps} fps{durationSec ? ` → ${durationSec.toFixed(1)}s` : ""}
              <input
                type="range"
                min={1}
                max={30}
                value={settings.fps}
                onChange={(e) => updateSettings({ fps: Number(e.target.value) })}
                className="mt-1 w-full accent-[var(--graphite-primary)]"
              />
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={settings.fps}
              onChange={(e) => updateSettings({ fps: Number(e.target.value) })}
              className="mt-2 w-20 rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-xs text-[var(--graphite-text-header)]"
            />
          </AnalyzeAccordion>

          <AnalyzeAccordion title="Overlay" open={openSection === "overlay"} onToggle={() => toggle("overlay")}>
            <div className="flex flex-col gap-1.5">
              {([["clean", "Clean — no marks (raw thermal)"], ["keep", "Keep marks static"], ["animate", "Animate temperatures changing"]] as [MotionSettings["overlay"], string][]).map(([v, label]) => (
                <label key={v} className="flex items-center gap-2 text-[11px] text-[var(--graphite-text-header)]">
                  <input type="radio" name="motion-overlay" checked={settings.overlay === v} onChange={() => updateSettings({ overlay: v })} className="accent-[var(--graphite-primary)]" />
                  {label}
                </label>
              ))}
            </div>
          </AnalyzeAccordion>

          <AnalyzeAccordion title="Output" open={openSection === "Output"} onToggle={() => toggle("Output")}>
            <label className="block text-[11px] text-[var(--graphite-muted)]">
              Aspect ratio
              <select
                value={settings.aspect}
                onChange={(e) => updateSettings({ aspect: e.target.value as MotionSettings["aspect"] })}
                className="mt-1 block w-full rounded-md border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas-deep)] px-2 py-1 text-xs text-[var(--graphite-text-header)]"
              >
                {ASPECTS.map((a) => (
                  <option key={a} value={a}>
                    {a === "original" ? "Original" : a}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-2 block text-[11px] text-[var(--graphite-muted)]">
              Smoothing
              <select
                value={settings.smoothing}
                onChange={(e) => updateSettings({ smoothing: e.target.value as MotionSettings["smoothing"] })}
                className="mt-1 block w-full rounded-md border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas-deep)] px-2 py-1 text-xs text-[var(--graphite-text-header)]"
              >
                <option value="none">None</option>
                <option value="interpolate">Motion interpolation</option>
                <option value="rife">High quality (RIFE)</option>
              </select>
            </label>
            <label className="mt-2 flex items-center gap-2 text-[11px] text-[var(--graphite-text-header)]">
              <input type="checkbox" checked={settings.deflicker} onChange={(e) => updateSettings({ deflicker: e.target.checked })} className="accent-[var(--graphite-primary)]" />
              Deflicker
            </label>
            <label className="mt-1 flex items-center gap-2 text-[11px] text-[var(--graphite-text-header)]">
              <input type="checkbox" checked={settings.retainRadiometric} onChange={(e) => updateSettings({ retainRadiometric: e.target.checked })} className="accent-[var(--graphite-primary)]" />
              Also retain radiometric stack
            </label>
          </AnalyzeAccordion>

          <div className="mt-2 flex flex-col gap-1.5 p-1">
            <button
              type="button"
              disabled={busy || frameCountInRange < 1}
              onClick={() => void render()}
              className="w-full rounded-lg bg-[var(--graphite-primary)] px-3 py-2 text-sm font-semibold text-[var(--graphite-canvas)] disabled:opacity-50"
            >
              {busy ? "Queuing…" : `Render ${mode === "timelapse" ? "time-lapse" : "video"} → MP4`}
            </button>
            {status ? <p className="text-[11px] text-[var(--graphite-muted)]">{status}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
