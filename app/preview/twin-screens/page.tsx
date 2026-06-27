"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Flashlight,
  FlashlightOff,
  AlertTriangle,
  Loader2,
  Check,
  Plus,
  RotateCcw,
  Coins,
  Clock,
  ChevronDown,
  Box,
} from "lucide-react";

/**
 * Side-by-side browser mockup of BOTH Twin 360 screens — the native capture HUD and the
 * post-capture "Scan ready" screen — in the Graphite Glass language, Twin blue. This is the
 * design target we approve here, then implement (capture = SwiftUI, post-capture = web).
 * Unauthenticated harness at /preview/twin-screens.
 */

const CANVAS = "var(--graphite-canvas)";
const BLUE = "var(--twin360-blue)";
const MUTED = "var(--graphite-muted)";
const BODY = "var(--graphite-text-body)";
const GLASS =
  "border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_64%,transparent)] backdrop-blur-md";

function Phone({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</span>
      <div
        className="relative aspect-[9/19.5] w-[300px] overflow-hidden rounded-[40px] border border-white/10"
        style={{ background: `radial-gradient(120% 80% at 50% 18%, #1a2230 0%, ${CANVAS} 70%)` }}
      >
        {children}
      </div>
    </div>
  );
}

// ───────────────────────── Capture HUD ─────────────────────────
type HudState = "ready" | "recording" | "warning" | "saving";

function CaptureHud({ state, torch, setTorch }: { state: HudState; torch: boolean; setTorch: (v: boolean) => void }) {
  const recording = state === "recording" || state === "warning";
  return (
    <>
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 40% at 50% 45%, rgba(61,142,255,0.06), transparent 70%)" }} />

      {/* top chrome */}
      <div className="absolute inset-x-0 top-7 px-3">
        <div className={`flex h-11 items-center justify-between rounded-2xl px-2 ${GLASS}`}>
          <button className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: BLUE, background: "color-mix(in srgb, var(--twin360-blue) 14%, transparent)" }}>
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} /> Back
          </button>
          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            {recording ? <span className="h-2 w-2 rounded-full bg-red-500" /> : null}
            <span className="text-[14px] font-bold text-white">{recording ? "1:24" : "0:00"}</span>
          </div>
          <button onClick={() => setTorch(!torch)} className="flex h-9 w-9 items-center justify-center rounded-xl border"
            style={torch
              ? { borderColor: "color-mix(in srgb, var(--twin360-blue) 55%, transparent)", background: "color-mix(in srgb, var(--twin360-blue) 18%, transparent)", color: BLUE }
              : { borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", color: MUTED }}>
            {torch ? <Flashlight className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className={`rounded-full px-3 py-1 font-mono text-[11px] font-semibold ${GLASS}`} style={{ color: BLUE }}>LIDAR · 184K pts</span>
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${GLASS}`} style={{ color: BODY }}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Tracking good
          </span>
        </div>
      </div>

      {state === "recording" ? (
        <div className="absolute inset-x-0 bottom-40 flex justify-center px-6">
          <span className={`rounded-xl px-3.5 py-2 text-center text-[12px] font-medium ${GLASS}`} style={{ color: BODY }}>
            Move slowly · capture corners · keep steady
          </span>
        </div>
      ) : null}
      {state === "warning" ? (
        <div className="absolute inset-x-0 bottom-40 flex justify-center px-6">
          <span className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/15 px-3.5 py-2 text-center text-[12px] font-semibold text-amber-200 backdrop-blur-md">
            <AlertTriangle className="h-4 w-4" /> Device warming — finish soon
          </span>
        </div>
      ) : null}

      {state !== "saving" ? (
        <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-2">
          <button className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white/85"
            style={{ background: recording ? "transparent" : BLUE }}>
            {recording ? <span className="h-6 w-6 rounded-md bg-red-500" /> : <span className="text-[14px] font-black" style={{ color: CANVAS }}>REC</span>}
          </button>
          <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>{recording ? "Tap to stop" : "Tap to start"}</span>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
          <div className={`flex flex-col items-center gap-3 rounded-2xl px-7 py-5 ${GLASS}`}>
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: BLUE }} />
            <p className="text-[14px] font-semibold text-white">Saving scan…</p>
            <p className="text-[11px]" style={{ color: MUTED }}>Writing video, LiDAR & poses</p>
          </div>
        </div>
      )}
    </>
  );
}

// ───────────────────────── Post-capture: Scan ready ─────────────────────────
function SubmitScreen() {
  const [quality, setQuality] = useState(0);
  const tiers = [
    { l: "Draft", t: "~3 min", c: 6 },
    { l: "Standard", t: "~12 min", c: 14 },
    { l: "High", t: "~25 min", c: 24 },
  ];
  const ctx = ["None", "½ blk", "1 blk", "2 blk"];
  const credits = tiers[quality].c;
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden px-4 pt-8">
        {/* top */}
        <div className="flex h-9 items-center justify-between">
          <button className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: BLUE, background: "color-mix(in srgb, var(--twin360-blue) 14%, transparent)" }}>
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} /> Back
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>Scan ready</span>
          <span className="w-12" />
        </div>

        {/* hero */}
        <div className="mt-3 flex gap-3">
          <div className="flex h-[72px] w-[96px] shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${BLUE} 22%, ${CANVAS}), #11161E)` }}>
            <Box className="h-7 w-7" style={{ color: BLUE }} />
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            <h1 className="truncate text-[17px] font-semibold text-white">Quick scan</h1>
            <p className="text-[12px]" style={{ color: MUTED }}>Jun 27 · 467K pts · 0:15</p>
            <span className="mt-0.5 inline-flex w-fit items-center gap-1 text-[11px] font-medium text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Uploaded
            </span>
          </div>
        </div>

        {/* action tiles */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {[{ i: RotateCcw, l: "Scan again", s: "Add to this twin" }, { i: Plus, l: "Add sources", s: "Drone · 360 · files" }].map((a) => (
            <div key={a.l} className={`flex min-h-[74px] flex-col justify-center gap-1 rounded-2xl px-3 ${GLASS}`}>
              <a.i className="h-5 w-5" style={{ color: BLUE }} />
              <span className="text-[13px] font-semibold text-white">{a.l}</span>
              <span className="text-[10px]" style={{ color: MUTED }}>{a.s}</span>
            </div>
          ))}
        </div>

        {/* quality */}
        <p className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>Quality</p>
        <div className="grid grid-cols-3 gap-1.5">
          {tiers.map((t, i) => (
            <button key={t.l} onClick={() => setQuality(i)}
              className="flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2"
              style={quality === i
                ? { borderColor: BLUE, background: "color-mix(in srgb, var(--twin360-blue) 16%, transparent)" }
                : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
              <span className="text-[12px] font-semibold" style={{ color: quality === i ? "#fff" : BODY }}>{t.l}</span>
              <span className="text-[10px]" style={{ color: MUTED }}>{t.t}</span>
              <span className="text-[10px]" style={{ color: MUTED }}>{t.c} cr</span>
            </button>
          ))}
        </div>

        {/* surrounding context */}
        <div className="mt-3 flex items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>Context</p>
          <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[8px] font-semibold uppercase" style={{ color: MUTED }}>soon</span>
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          {ctx.map((c, i) => (
            <div key={c} className="rounded-xl border px-1 py-1.5 text-center text-[11px] font-medium"
              style={i === 0
                ? { borderColor: BLUE, background: "color-mix(in srgb, var(--twin360-blue) 16%, transparent)", color: "#fff" }
                : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: MUTED, opacity: 0.5 }}>
              {c}
            </div>
          ))}
        </div>

        {/* assets */}
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>Captured assets · 3</span>
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: MUTED }}>7.6 MB <ChevronDown className="h-3.5 w-3.5" /></span>
        </div>
      </div>

      {/* sticky dock */}
      <div className={`px-4 pb-7 pt-3 ${GLASS}`} style={{ borderRadius: 0 }}>
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="font-semibold tabular-nums" style={{ color: BODY }}>112 credits available</span>
          <span style={{ color: MUTED }}>Total · {credits} cr · {tiers[quality].t}</span>
        </div>
        <button className="flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-bold" style={{ background: BLUE, color: CANVAS }}>
          <Coins className="h-4 w-4" /> Process into 3D model · {credits} credits
        </button>
      </div>
    </div>
  );
}

export default function TwinScreensPreview() {
  const [hud, setHud] = useState<HudState>("recording");
  const [torch, setTorch] = useState(false);
  const states: HudState[] = ["ready", "recording", "warning", "saving"];
  return (
    <div className="min-h-screen w-full bg-black px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-center text-lg font-semibold text-white">Twin 360 — capture & post-capture</h1>
        <p className="mt-1 text-center text-[13px] text-white/45">Graphite Glass · Twin blue. Design target for SwiftUI (capture) + web (post-capture).</p>

        <div className="mt-4 flex items-center justify-center gap-1 text-[11px]">
          <span className="mr-1 font-mono uppercase tracking-wider text-white/35">capture state</span>
          {states.map((s) => (
            <button key={s} onClick={() => setHud(s)}
              className="rounded-md px-2 py-1 font-mono uppercase tracking-wide"
              style={hud === s ? { color: BLUE, background: "color-mix(in srgb, var(--twin360-blue) 16%, transparent)" } : { color: "rgba(255,255,255,0.4)" }}>
              {s}
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-start justify-center gap-10">
          <Phone label="Capture"><CaptureHud state={hud} torch={torch} setTorch={setTorch} /></Phone>
          <Phone label="Scan ready (post-capture)"><SubmitScreen /></Phone>
        </div>
      </div>
    </div>
  );
}
