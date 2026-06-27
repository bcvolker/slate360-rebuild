"use client";

import { useState } from "react";
import {
  ChevronLeft as IconChevronLeft,
  Flashlight as IconFlashlight,
  FlashlightOff as IconFlashlightOff,
  AlertTriangle as IconAlertTriangle,
  Loader2 as IconLoader2,
} from "lucide-react";

/**
 * Browser preview of the proposed native Twin 360 capture HUD (Graphite Glass, blue).
 * This is the design target we approve here, then implement 1:1 in SwiftUI. Unauthenticated
 * harness — view at /preview/twin-capture-hud. Toggle the states with the bar at the top.
 */

type HudState = "ready" | "recording" | "warning" | "saving";

const CANVAS = "var(--graphite-canvas)";
const BLUE = "var(--twin360-blue)";
const MUTED = "var(--graphite-muted)";

const GLASS =
  "border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_64%,transparent)] backdrop-blur-md";

function StatePicker({ state, onChange }: { state: HudState; onChange: (s: HudState) => void }) {
  const states: HudState[] = ["ready", "recording", "warning", "saving"];
  return (
    <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-center gap-1 bg-black/40 px-3 py-2 text-[11px] backdrop-blur-sm">
      <span className="mr-2 font-mono uppercase tracking-wider text-white/40">preview state</span>
      {states.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`rounded-md px-2 py-1 font-mono uppercase tracking-wide transition ${
            state === s ? "text-[color:var(--twin360-blue)]" : "text-white/45"
          }`}
          style={state === s ? { background: "color-mix(in srgb, var(--twin360-blue) 16%, transparent)" } : undefined}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export default function TwinCaptureHudPreview() {
  const [state, setState] = useState<HudState>("recording");
  const [torch, setTorch] = useState(false);
  const recording = state === "recording" || state === "warning";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black p-4">
      {/* Phone frame */}
      <div
        className="relative mx-auto aspect-[9/19.5] w-full max-w-[380px] overflow-hidden rounded-[44px] border border-white/10"
        style={{ background: `radial-gradient(120% 80% at 50% 20%, #1a2230 0%, ${CANVAS} 70%)` }}
      >
        <StatePicker state={state} onChange={setState} />

        {/* Faux camera depth hint */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 40% at 50% 45%, rgba(61,142,255,0.06), transparent 70%)" }}
        />

        {/* ── TOP CHROME: cancel · timer · torch ── */}
        <div className="absolute inset-x-0 top-9 px-4">
          <div className={`flex h-11 items-center justify-between rounded-2xl px-2 ${GLASS}`}>
            <button className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[12px] font-bold uppercase tracking-wider"
              style={{ color: BLUE, background: "color-mix(in srgb, var(--twin360-blue) 14%, transparent)" }}>
              <IconChevronLeft className="h-4 w-4" strokeWidth={2.5} /> Back
            </button>

            <div className="flex items-center gap-2 font-mono tabular-nums">
              {recording ? <span className="h-2 w-2 rounded-full bg-red-500" /> : null}
              <span className="text-[15px] font-bold text-white">{recording ? "1:24" : "0:00"}</span>
            </div>

            <button
              onClick={() => setTorch((t) => !t)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border"
              style={
                torch
                  ? { borderColor: "color-mix(in srgb, var(--twin360-blue) 55%, transparent)", background: "color-mix(in srgb, var(--twin360-blue) 18%, transparent)", color: BLUE }
                  : { borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", color: MUTED }
              }
            >
              {torch ? <IconFlashlight className="h-5 w-5" /> : <IconFlashlightOff className="h-5 w-5" />}
            </button>
          </div>

          {/* STATUS ROW: lidar + tracking */}
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className={`rounded-full px-3 py-1 font-mono text-[12px] font-semibold ${GLASS}`} style={{ color: BLUE }}>
              LIDAR · 184K pts
            </span>
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${GLASS}`}
              style={{ color: "var(--graphite-text-body)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Tracking good
            </span>
          </div>
        </div>

        {/* ── CENTER GUIDANCE (ephemeral) ── */}
        {state === "recording" ? (
          <div className="absolute inset-x-0 bottom-44 flex justify-center px-6">
            <span className={`rounded-xl px-4 py-2 text-center text-[13px] font-medium ${GLASS}`} style={{ color: "var(--graphite-text-body)" }}>
              Move slowly · capture corners · keep steady
            </span>
          </div>
        ) : null}

        {/* WARNING banner */}
        {state === "warning" ? (
          <div className="absolute inset-x-0 bottom-44 flex justify-center px-6">
            <span className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/15 px-4 py-2 text-center text-[13px] font-semibold text-amber-200 backdrop-blur-md">
              <IconAlertTriangle className="h-4 w-4" /> Device warming — finish this area soon
            </span>
          </div>
        ) : null}

        {/* ── BOTTOM: shutter ── */}
        {state !== "saving" ? (
          <div className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-2">
            <button
              className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-white/85"
              style={{ background: recording ? "transparent" : BLUE }}
            >
              {recording ? (
                <span className="h-7 w-7 rounded-md bg-red-500" />
              ) : (
                <span className="text-[15px] font-black" style={{ color: CANVAS }}>REC</span>
              )}
            </button>
            <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: MUTED }}>
              {recording ? "Tap to stop" : "Tap to start"}
            </span>
          </div>
        ) : (
          /* SAVING overlay */
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
            <div className={`flex flex-col items-center gap-3 rounded-2xl px-8 py-6 ${GLASS}`}>
              <IconLoader2 className="h-8 w-8 animate-spin" style={{ color: BLUE }} />
              <p className="text-[15px] font-semibold text-white">Saving scan…</p>
              <p className="text-[12px]" style={{ color: MUTED }}>Writing video, LiDAR & poses</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
