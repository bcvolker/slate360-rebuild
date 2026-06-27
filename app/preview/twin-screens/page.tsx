"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  Flashlight,
  FlashlightOff,
  AlertTriangle,
  Loader2,
  Check,
  Plus,
  RotateCcw,
  Coins,
  Box,
  Lock,
  LockOpen,
  Camera,
  ArrowRight,
} from "lucide-react";

/**
 * Side-by-side browser mockup of the Twin 360 capture flow vs the Site Walk capture screen.
 * Twin = blue (full feature rebuild). Site Walk = green (reference only — the real Site Walk
 * code is NOT touched). Unauthenticated harness at /preview/twin-screens.
 */

const CANVAS = "var(--graphite-canvas)";
const BLUE = "var(--twin360-blue)";
const GREEN = "var(--graphite-primary)"; // Site Walk teal/green #00E699
const MUTED = "var(--graphite-muted)";
const BODY = "var(--graphite-text-body)";
const glass = (a = 64) =>
  `border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_${a}%,transparent)] backdrop-blur-md`;

function Phone({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</span>
      <div className="relative aspect-[9/19.5] w-[300px] overflow-hidden rounded-[40px] border border-white/10"
        style={{ background: `radial-gradient(120% 80% at 50% 18%, #1a2230 0%, ${CANVAS} 70%)` }}>
        {children}
      </div>
    </div>
  );
}

function Tool({ icon: Icon, label, active, accent, onClick }: { icon: typeof Camera; label: string; active?: boolean; accent: string; onClick?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button onClick={onClick} className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border"
        style={active
          ? { borderColor: `color-mix(in srgb, ${accent} 55%, transparent)`, background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent }
          : { borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", color: MUTED }}>
        <Icon className="h-5 w-5" />
      </button>
      <span className="text-[10px] font-medium" style={{ color: BODY }}>{label}</span>
    </div>
  );
}

// ───────────────── Twin capture (blue, full features) ─────────────────
type HudState = "ready" | "recording" | "warning" | "saving";

function TwinCapture({ state, mode, ae, torch, set }: {
  state: HudState; mode: "video" | "photos"; ae: boolean; torch: boolean;
  set: { mode: (m: "video" | "photos") => void; ae: (v: boolean) => void; torch: (v: boolean) => void };
}) {
  const [interval, setInterval] = useState<0.5 | 1 | 2>(1);
  const recording = state === "recording" || state === "warning";
  const clips = ["Clip 1"];

  return (
    <div className="flex h-full flex-col px-3 pb-5 pt-6">
      {/* TOP BAR */}
      <div className={`flex h-10 items-center justify-between rounded-2xl px-2 ${glass()}`} style={{ borderColor: "color-mix(in srgb, var(--twin360-blue) 28%, transparent)" }}>
        <button className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: BLUE, background: "color-mix(in srgb, var(--twin360-blue) 14%, transparent)" }}>
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} /> Back
        </button>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: BLUE }}>Quick scan</span>
        <button className={`flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold ${glass(40)}`} style={{ color: BODY }}>
          {clips.length} <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* STATUS CHIPS */}
      <div className="mt-2 flex items-center justify-center gap-1.5">
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold ${glass(72)}`} style={{ color: BLUE }}>LIDAR · 184K</span>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold ${glass(72)}`} style={{ color: BODY }}>62% COVERED</span>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold ${glass(72)}`} style={{ color: MUTED }}>GPS ✓</span>
      </div>

      {/* AE LOCK + timer */}
      <div className="mt-2 flex items-center justify-between">
        <button onClick={() => set.ae(!ae)} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${glass(60)}`}
          style={ae ? { color: BLUE, borderColor: "color-mix(in srgb, var(--twin360-blue) 55%, transparent)" } : { color: MUTED }}>
          {ae ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />} {ae ? "AE Locked" : "AE Auto"}
        </button>
        {recording ? (
          <span className="flex items-center gap-1.5 font-mono tabular-nums">
            <span className="h-2 w-2 rounded-full bg-red-500" /><span className="text-[14px] font-bold text-white">1:24</span>
          </span>
        ) : <span className="font-mono text-[14px] font-bold tabular-nums text-white/50">0:00</span>}
      </div>

      {/* GUIDE (ephemeral, recording) */}
      <div className="flex flex-1 items-end justify-center pb-2">
        {state === "recording" ? (
          <span className={`rounded-xl px-3.5 py-2 text-center text-[12px] font-medium ${glass()}`} style={{ color: BODY }}>Move slowly · keep steady</span>
        ) : state === "warning" ? (
          <span className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/15 px-3.5 py-2 text-[12px] font-semibold text-amber-200 backdrop-blur-md">
            <AlertTriangle className="h-4 w-4" /> Device warming — finish soon
          </span>
        ) : null}
      </div>

      {/* CLIP CHIPS */}
      <div className="mb-2 flex items-center gap-1.5">
        {clips.map((c) => (
          <span key={c} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${glass(50)}`} style={{ color: BLUE }}>
            <Check className="h-3 w-3" /> {c}
          </span>
        ))}
      </div>

      {/* MODE SELECTOR */}
      <div className={`mb-3 flex items-center gap-1 self-center rounded-xl p-1 ${glass(60)}`}>
        {(["video", "photos"] as const).map((m) => (
          <button key={m} onClick={() => set.mode(m)} className="rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em]"
            style={mode === m ? { background: BLUE, color: CANVAS } : { color: "rgba(255,255,255,0.55)" }}>{m}</button>
        ))}
        {mode === "photos" ? (
          <div className="ml-1 flex items-center gap-1 border-l border-white/10 pl-1">
            {([0.5, 1, 2] as const).map((s) => (
              <button key={s} onClick={() => setInterval(s)} className="rounded-md px-1.5 py-1 text-[10px] font-bold"
                style={interval === s ? { color: BLUE } : { color: MUTED }}>{s}s</button>
            ))}
          </div>
        ) : null}
      </div>

      {/* BOTTOM RAIL: torch · shutter · done */}
      <div className="flex items-end justify-between px-1">
        <Tool icon={torch ? Flashlight : FlashlightOff} label="Torch" active={torch} accent={BLUE} onClick={() => set.torch(!torch)} />
        <div className="flex flex-col items-center gap-1">
          <button className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white/85" style={{ background: recording ? "transparent" : BLUE }}>
            {recording ? <span className="h-6 w-6 rounded-md bg-red-500" /> : <span className="text-[13px] font-black" style={{ color: CANVAS }}>{mode === "photos" ? "PHOTO" : "REC"}</span>}
          </button>
        </div>
        <Tool icon={Check} label="Done" accent={BLUE} />
      </div>

      {state === "saving" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
          <div className={`flex flex-col items-center gap-3 rounded-2xl px-7 py-5 ${glass()}`}>
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: BLUE }} />
            <p className="text-[14px] font-semibold text-white">Saving scan…</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ───────────────── Site Walk capture (green, REFERENCE — not redesigned) ─────────────────
function SiteWalkCapture() {
  return (
    <div className="flex h-full flex-col px-3 pb-5 pt-6">
      <div className={`flex h-10 items-center justify-between rounded-2xl px-2 ${glass()}`} style={{ borderColor: "color-mix(in srgb, var(--graphite-primary) 28%, transparent)" }}>
        <button className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: GREEN, background: "color-mix(in srgb, var(--graphite-primary) 14%, transparent)" }}>
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} /> Back
        </button>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: GREEN }}>Level 2 · East</span>
        <button className={`flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold ${glass(40)}`} style={{ color: BODY }}>4 <ChevronDown className="h-3.5 w-3.5" /></button>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5">
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold ${glass(72)}`} style={{ color: GREEN }}>CAMERA</span>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold ${glass(72)}`} style={{ color: MUTED }}>4 PHOTOS</span>
      </div>

      <div className="flex flex-1 items-end justify-center pb-2">
        <span className={`rounded-xl px-3.5 py-2 text-center text-[12px] font-medium ${glass()}`} style={{ color: BODY }}>Frame the work · tap to capture</span>
      </div>

      {/* filmstrip */}
      <div className="mb-3 flex gap-1.5 overflow-hidden">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-12 w-12 shrink-0 rounded-lg border border-white/10" style={{ background: "linear-gradient(135deg,#243042,#11161e)" }} />
        ))}
      </div>

      {/* bottom rail */}
      <div className="flex items-end justify-between px-1">
        <Tool icon={Flashlight} label="Torch" accent={GREEN} />
        <div className="flex flex-col items-center gap-1">
          <button className="flex h-[72px] items-center justify-center gap-1 rounded-full border-4 border-white/85 px-5" style={{ background: GREEN }}>
            <Camera className="h-4 w-4" style={{ color: CANVAS }} strokeWidth={2.5} />
            <span className="text-[12px] font-black" style={{ color: CANVAS }}>NEXT</span>
            <ArrowRight className="h-4 w-4" style={{ color: CANVAS }} strokeWidth={2.5} />
          </button>
        </div>
        <Tool icon={ArrowRight} label="Details" accent={GREEN} />
      </div>
    </div>
  );
}

// ───────────────── Twin post-capture (blue) ─────────────────
function SubmitScreen() {
  const [quality, setQuality] = useState(0);
  const tiers = [{ l: "Draft", t: "~3 min", c: 6 }, { l: "Standard", t: "~12 min", c: 14 }, { l: "High", t: "~25 min", c: 24 }];
  const credits = tiers[quality].c;
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden px-4 pt-8">
        <div className="flex h-9 items-center justify-between">
          <button className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: BLUE, background: "color-mix(in srgb, var(--twin360-blue) 14%, transparent)" }}>
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} /> Back
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>Scan ready</span>
          <span className="w-12" />
        </div>
        <div className="mt-3 flex gap-3">
          <div className="flex h-[72px] w-[96px] shrink-0 items-center justify-center rounded-2xl" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${BLUE} 22%, ${CANVAS}), #11161E)` }}>
            <Box className="h-7 w-7" style={{ color: BLUE }} />
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            <h1 className="truncate text-[17px] font-semibold text-white">Quick scan</h1>
            <p className="text-[12px]" style={{ color: MUTED }}>Jun 27 · 467K pts · 0:15</p>
            <span className="mt-0.5 inline-flex w-fit items-center gap-1 text-[11px] font-medium text-emerald-400"><Check className="h-3.5 w-3.5" /> Uploaded</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {[{ i: RotateCcw, l: "Scan again", s: "Add to this twin" }, { i: Plus, l: "Add sources", s: "Drone · 360 · files" }].map((a) => (
            <div key={a.l} className={`flex min-h-[74px] flex-col justify-center gap-1 rounded-2xl px-3 ${glass()}`}>
              <a.i className="h-5 w-5" style={{ color: BLUE }} />
              <span className="text-[13px] font-semibold text-white">{a.l}</span>
              <span className="text-[10px]" style={{ color: MUTED }}>{a.s}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>Quality</p>
        <div className="grid grid-cols-3 gap-1.5">
          {tiers.map((t, i) => (
            <button key={t.l} onClick={() => setQuality(i)} className="flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2"
              style={quality === i ? { borderColor: BLUE, background: "color-mix(in srgb, var(--twin360-blue) 16%, transparent)" } : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
              <span className="text-[12px] font-semibold" style={{ color: quality === i ? "#fff" : BODY }}>{t.l}</span>
              <span className="text-[10px]" style={{ color: MUTED }}>{t.t}</span>
              <span className="text-[10px]" style={{ color: MUTED }}>{t.c} cr</span>
            </button>
          ))}
        </div>
      </div>
      <div className={`px-4 pb-7 pt-3 ${glass()}`} style={{ borderRadius: 0 }}>
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
  const [state, setState] = useState<HudState>("recording");
  const [mode, setMode] = useState<"video" | "photos">("video");
  const [ae, setAe] = useState(true);
  const [torch, setTorch] = useState(false);
  const states: HudState[] = ["ready", "recording", "warning", "saving"];

  return (
    <div
      className="min-h-screen w-full bg-black px-4 py-8"
      style={{
        // Self-contained tokens so the bare /preview route never depends on global CSS.
        "--graphite-canvas": "#0B0F15",
        "--twin360-blue": "#3D8EFF",
        "--graphite-primary": "#00E699",
        "--graphite-muted": "#A3AED0",
        "--graphite-text-body": "#F8FAFC",
      } as React.CSSProperties}
    >
      <div className="mx-auto max-w-6xl">
        <h1 className="text-center text-lg font-semibold text-white">
          Twin 360 capture · Site Walk capture · Twin post-capture
          <span className="text-[color:var(--twin360-blue)]"> · v3</span>
        </h1>
        <p className="mt-1 text-center text-[13px] text-white/45">Same Graphite Glass system — Twin = blue, Site Walk = green (reference, not redesigned). Three phones below.</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-1 text-[11px]">
          <span className="mr-1 font-mono uppercase tracking-wider text-white/35">capture state</span>
          {states.map((s) => (
            <button key={s} onClick={() => setState(s)} className="rounded-md px-2 py-1 font-mono uppercase tracking-wide"
              style={state === s ? { color: BLUE, background: "color-mix(in srgb, var(--twin360-blue) 16%, transparent)" } : { color: "rgba(255,255,255,0.4)" }}>{s}</button>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-start justify-center gap-8">
          <Phone label="Twin 360 — Capture"><TwinCapture state={state} mode={mode} ae={ae} torch={torch} set={{ mode: setMode, ae: setAe, torch: setTorch }} /></Phone>
          <Phone label="Site Walk — Capture (reference)"><SiteWalkCapture /></Phone>
          <Phone label="Twin 360 — Scan ready"><SubmitScreen /></Phone>
        </div>
      </div>
    </div>
  );
}
