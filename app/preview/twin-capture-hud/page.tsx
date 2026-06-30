"use client";

import { useState } from "react";
import {
  ChevronLeft as IconBack,
  Flashlight as IconTorch,
  FlashlightOff as IconTorchOff,
  Home as IconHome,
  Maximize2 as IconMaximize,
  Check as IconCheck,
  Sun as IconSun,
  Loader2 as IconLoader2,
} from "lucide-react";

/**
 * Browser preview of the Twin 360 capture HUD — the approved 1:1 target for the native
 * SwiftUI HUD (docs/design/TWIN_CAPTURE_HUD_SPEC.md + lib/digital-twin/twin-capture-hud-contract.ts).
 * Graphite Glass, Twin blue, tokens only (NO amber). Toggle states with the top bar.
 */

type HudState = "ready" | "recording" | "warning" | "saving";
type Mode = "video" | "photos";

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
          className="rounded-md px-2 py-1 font-mono uppercase tracking-wide transition"
          style={
            state === s
              ? { color: BLUE, background: "color-mix(in srgb, var(--twin360-blue) 16%, transparent)" }
              : { color: "rgba(255,255,255,0.45)" }
          }
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/** Top-bar square glass tool (Maximize / Home) — Site Walk header parity. */
function TopTool({ icon: Icon, label }: { icon: typeof IconHome; label: string }) {
  return (
    <button
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]"
      style={{ color: MUTED }}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

export default function TwinCaptureHudPreview() {
  const [state, setState] = useState<HudState>("recording");
  const [torch, setTorch] = useState(false);
  const [mode, setMode] = useState<Mode>("video");
  const recording = state === "recording" || state === "warning";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black p-4">
      <div
        className="relative mx-auto aspect-[9/19.5] w-full max-w-[380px] overflow-hidden rounded-[44px] border border-white/10"
        style={{ background: `radial-gradient(120% 80% at 50% 20%, #1a2230 0%, ${CANVAS} 70%)` }}
      >
        <StatePicker state={state} onChange={setState} />
        {/* persistent blue accent / recording bar */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-40"
          style={
            recording && mode === "video"
              ? { height: 8, background: "var(--destructive)", boxShadow: "0 0 12px 2px var(--destructive)" }
              : { height: 4, background: BLUE }
          }
        />

        {/* ── TOP BAR: Back · title · Maximize · Done · Home ── */}
        <div className="absolute inset-x-0 top-9 px-4">
          <div className={`flex h-11 items-center gap-2 rounded-2xl px-2 ${GLASS}`}>
            <button
              className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[12px] font-bold uppercase tracking-wider"
              style={{ color: BLUE, background: "color-mix(in srgb, var(--twin360-blue) 14%, transparent)" }}
            >
              <IconBack className="h-4 w-4" strokeWidth={2.5} /> Back
            </button>
            <span className="flex-1 truncate font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color: BLUE }}>
              Twin 360{recording ? (mode === "video" ? " · REC" : " · CAPTURING") : " · Ready"}
            </span>
            <span className="font-mono text-[14px] font-bold tabular-nums text-white">{recording ? "1:24" : "0:00"}</span>
            <TopTool icon={IconMaximize} label="Hide controls" />
            <TopTool icon={IconHome} label="Home" />
          </div>

          {/* status chips: LiDAR (additive) + tracking */}
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className={`rounded-full px-3 py-1 font-mono text-[12px] font-semibold ${GLASS}`} style={{ color: BLUE }}>
              LiDAR · 184K pts
            </span>
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${GLASS}`} style={{ color: "var(--graphite-text-body)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} /> Tracking good
            </span>
          </div>
        </div>

        {/* ── center guidance / warning (tokens, no amber) ── */}
        {state === "recording" ? (
          <div className="absolute inset-x-0 bottom-[230px] flex justify-center px-6">
            <span className={`rounded-xl px-4 py-2 text-center text-[13px] font-medium ${GLASS}`} style={{ color: "var(--graphite-text-body)" }}>
              Move slowly · capture corners · keep steady
            </span>
          </div>
        ) : null}
        {state === "warning" ? (
          <div className="absolute inset-x-0 bottom-[230px] flex justify-center px-6">
            <span
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-center text-[13px] font-semibold backdrop-blur-md"
              style={{ color: BLUE, border: "1px solid color-mix(in srgb, var(--twin360-blue) 40%, transparent)", background: "color-mix(in srgb, var(--twin360-blue) 14%, transparent)" }}
            >
              Device warming — finish this area soon
            </span>
          </div>
        ) : null}

        {state !== "saving" ? (
          <>
            {/* exposure / quality pill row — DISABLED "Auto (LiDAR)" on the ARKit path */}
            <div className="absolute inset-x-0 bottom-[176px] flex justify-center">
              <span
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{ color: MUTED, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
                title="Exposure is auto during LiDAR ARKit capture"
              >
                <IconSun className="h-3.5 w-3.5" /> Exposure · Auto (LiDAR)
              </span>
            </div>

            {/* mode selector — Photos / Video */}
            <div className="absolute inset-x-0 bottom-[132px] flex justify-center">
              <div className={`flex items-center gap-0.5 rounded-full p-0.5 ${GLASS}`}>
                {(["video", "photos"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="rounded-full px-4 py-1 text-[12px] font-bold uppercase tracking-wide transition"
                    style={mode === m ? { color: CANVAS, background: BLUE } : { color: MUTED }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* bottom rail: labeled torch "Light" · shutter · Done */}
            <div className="absolute inset-x-0 bottom-11 flex items-end justify-center gap-8 px-6">
              <div className="flex w-12 flex-col items-center gap-1.5">
                <button
                  onClick={() => setTorch((t) => !t)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border"
                  style={
                    torch
                      ? { borderColor: "color-mix(in srgb, var(--twin360-blue) 55%, transparent)", background: "color-mix(in srgb, var(--twin360-blue) 18%, transparent)", color: BLUE }
                      : { borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", color: MUTED }
                  }
                >
                  {torch ? <IconTorch className="h-5 w-5" /> : <IconTorchOff className="h-5 w-5" />}
                </button>
                <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>Light</span>
              </div>

              <button
                className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-white/85"
                style={{ background: recording ? "transparent" : BLUE }}
              >
                {recording ? <span className="h-7 w-7 rounded-md" style={{ background: "var(--destructive)" }} /> : <span className="text-[15px] font-black" style={{ color: CANVAS }}>REC</span>}
              </button>

              <div className="flex w-12 flex-col items-center gap-1.5">
                <button
                  className="flex h-14 w-14 items-center justify-center rounded-xl border"
                  style={{ borderColor: "color-mix(in srgb, var(--twin360-blue) 40%, transparent)", background: "color-mix(in srgb, var(--twin360-blue) 12%, transparent)", color: BLUE }}
                >
                  <IconCheck className="h-6 w-6" strokeWidth={2.5} />
                </button>
                <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>Done</span>
              </div>
            </div>
          </>
        ) : (
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
