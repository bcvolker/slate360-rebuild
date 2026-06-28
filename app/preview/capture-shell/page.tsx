"use client";

/**
 * Public design harness for the UNIFIED capture shell (Site Walk + Twin 360).
 *
 * Goal: get the Twin 360 capture HUD out of "Swift you can only see via TestFlight"
 * and into a browser you can iterate in seconds. Both screens are rendered from ONE
 * shell grammar — same geometry, same glass, same control language — differentiated
 * only by accent (Site Walk green / Twin 360 blue) and the mode-specific controls.
 *
 * This is a MOCKUP (static camera background, mock metrics). It is the design source
 * of truth that the React Site Walk screen and the native SwiftUI Twin HUD both target.
 *
 * Synthesizes the convergent recommendations from the multi-AI blueprint review:
 *  - One shell, two accents, identical zones (top bar / status / stage / guidance / mode / rail)
 *  - Pin becomes a visible TOOL (kills the invisible long-press), tap-to-place → bottom sheet
 *  - Twin gets a proper Video|Photos + interval + AE-lock row
 *  - Accent discipline: accent only on borders, active states, shutter ring — never flooded
 *  - Torch capability-gated (hidden on web/iOS Safari where getUserMedia has no torch)
 */

import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle as CircleIcon,
  Download,
  Eye,
  FlashlightOff,
  Loader2,
  Map as MapIcon,
  Share2,
  Square,
  Undo2,
  Layers,
  Lock,
  Images,
  Camera,
  ChevronRight,
  Clock,
  FileText,
  Folder,
  Ghost,
  Globe,
  Image as ImageIcon,
  Maximize2,
  MapPin,
  Mic,
  PenLine,
  Play,
  Plus,
  RotateCcw,
  Monitor,
  Search,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Trash2,
  Type as TypeIcon,
  UploadCloud,
  User,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

/* ------------------------------------------------------------------ tokens */

const GREEN = "var(--graphite-primary)";
const BLUE = "var(--twin360-blue)";
const CANVAS = "var(--graphite-canvas)";
const MUTED = "var(--graphite-muted)";
const GLASS_BORDER = "var(--mobile-app-card-border)";

const FRAME_W = 390;
const FRAME_H = 844;

const glass = "border bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] backdrop-blur-md";
const mono = "font-mono uppercase tracking-[0.12em]";

type Accent = string;

/* A mock interior camera frame so the stage never reads as a dead black box. */
function CameraStage({ accent, twin }: { accent: Accent; twin?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg,#1b2530 0%,#121922 38%,#0d141c 70%,#0a0f16 100%)",
        }}
      />
      {/* faux room: floor + wall seam */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: "linear-gradient(0deg,#0a0f16,transparent)" }}
      />
      <div
        className="absolute left-0 right-0 top-1/2 h-px opacity-40"
        style={{ background: "linear-gradient(90deg,transparent,#3b4756,transparent)" }}
      />
      {/* twin coverage mesh hint — the "scan guidance" hero */}
      {twin && (
        <svg className="absolute inset-0 h-full w-full opacity-[0.22]" preserveAspectRatio="none">
          <defs>
            <pattern id="mesh" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="skewX(-12)">
              <path d="M0 0 L34 0 M0 0 L0 34" stroke={BLUE} strokeWidth="0.75" fill="none" />
            </pattern>
          </defs>
          <rect x="0" y="46%" width="100%" height="54%" fill="url(#mesh)" />
        </svg>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- pieces */

function AccentHairline({ accent }: { accent: Accent }) {
  return <div className="absolute inset-x-0 top-0 h-1 z-30" style={{ background: accent }} />;
}

function TopBar({
  accent,
  title,
  backLabel,
  rightLabel,
  rightIcon,
}: {
  accent: Accent;
  title: string;
  backLabel: string;
  rightLabel: string;
  rightIcon: React.ReactNode;
}) {
  return (
    <div className="absolute inset-x-3 top-5 z-20 flex h-11 items-center justify-between">
      <button
        className={`flex h-9 items-center gap-1 rounded-xl ${glass} px-2.5`}
        style={{ borderColor: `color-mix(in srgb, ${accent} 40%, transparent)`, color: accent }}
      >
        <ArrowLeft size={16} />
        <span className={`text-[11px] ${mono} font-semibold`}>{backLabel}</span>
      </button>
      <span className={`text-[11px] ${mono} font-semibold`} style={{ color: accent }}>
        {title}
      </span>
      <button
        className={`flex h-9 items-center gap-1 rounded-xl ${glass} px-2.5`}
        style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}
      >
        {rightIcon}
        <span className={`text-[10px] ${mono}`}>{rightLabel}</span>
      </button>
    </div>
  );
}

function MetricChip({ label, value, good, accent }: { label: string; value: string; good?: boolean; accent: Accent }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-[10px] ${glass} px-2 py-1`}
      style={{ borderColor: GLASS_BORDER }}
    >
      <span className="font-mono text-[12px] font-semibold tabular-nums" style={{ color: good ? accent : "#E8EDF3" }}>
        {value}
      </span>
      <span className={`text-[9px] ${mono}`} style={{ color: MUTED }}>
        {label}
      </span>
    </div>
  );
}

/** Tappable field for the Twin photo planner (count / timeframe). Cycles on tap in the real build. */
function PhotoPlanField({ label, value, accent }: { label: string; value: string; accent: Accent }) {
  return (
    <button
      className={`flex flex-col items-center rounded-[8px] px-2.5 py-0.5`}
      style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
    >
      <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: accent }}>
        {value}
      </span>
      <span className={`text-[8px] ${mono}`} style={{ color: MUTED }}>
        {label}
      </span>
    </button>
  );
}

function GuidanceChip({ text }: { text: string }) {
  return (
    <div
      className={`rounded-[10px] ${glass} px-3 py-1.5`}
      style={{ borderColor: GLASS_BORDER }}
    >
      <span className="text-[12px] font-medium" style={{ color: "#F8FAFC" }}>
        {text}
      </span>
    </div>
  );
}

function ToolButton({
  icon,
  label,
  active,
  accent,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  accent: Accent;
  badge?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        className={`relative grid h-[52px] w-[52px] place-items-center rounded-xl ${glass}`}
        style={
          active
            ? {
                borderColor: accent,
                background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                color: accent,
                boxShadow: `0 0 0 2px color-mix(in srgb, ${accent} 50%, transparent)`,
              }
            : { borderColor: GLASS_BORDER, color: "#E8EDF3" }
        }
      >
        {icon}
        {badge ? (
          <span
            className="absolute -right-1 -top-1 grid h-[16px] min-w-[16px] place-items-center rounded-full px-1 text-[9px] font-bold text-black"
            style={{ background: accent }}
          >
            {badge}
          </span>
        ) : null}
      </button>
      <span className={`text-[9px] ${mono}`} style={{ color: active ? accent : MUTED }}>
        {label}
      </span>
    </div>
  );
}

function Shutter({ accent, recording, ring }: { accent: Accent; recording?: boolean; ring?: number }) {
  const R = 40;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative flex flex-col items-center gap-1">
      {typeof ring === "number" && (
        <svg className="pointer-events-none absolute -top-1.5 h-[84px] w-[84px] -rotate-90" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
          <circle cx="42" cy="42" r={R} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - ring)} />
        </svg>
      )}
      <button
        className="grid h-[72px] w-[72px] place-items-center rounded-full"
        style={{ border: `3px solid ${recording ? "#FF5A6A" : accent}` }}
      >
        {recording ? (
          <span className="h-[22px] w-[22px] rounded-[5px]" style={{ background: "#FF5A6A" }} />
        ) : (
          <span className="h-[58px] w-[58px] rounded-full" style={{ background: accent }} />
        )}
      </button>
    </div>
  );
}

function RailButton({
  icon,
  label,
  accent,
  filled,
}: {
  icon: React.ReactNode;
  label: string;
  accent: Accent;
  filled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        className={`grid h-[48px] w-[48px] place-items-center rounded-xl ${glass}`}
        style={
          filled
            ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent }
            : { borderColor: GLASS_BORDER, color: "#E8EDF3" }
        }
      >
        {icon}
      </button>
      <span className={`text-[9px] ${mono}`} style={{ color: MUTED }}>
        {label}
      </span>
    </div>
  );
}

function BottomRail({
  accent,
  recording,
  showTorch,
  doneLabel,
  rightNode,
  coverage,
}: {
  accent: Accent;
  recording?: boolean;
  showTorch: boolean;
  doneLabel: string;
  rightNode?: React.ReactNode;
  coverage?: number;
}) {
  return (
    <div className="absolute inset-x-4 bottom-6 z-20 grid grid-cols-[1fr_auto_1fr] items-end">
      <div className="flex justify-start">
        {showTorch ? (
          <RailButton icon={<FlashlightOff size={20} />} label="Light" accent={accent} />
        ) : (
          <span />
        )}
      </div>
      <Shutter accent={accent} recording={recording} ring={coverage} />
      <div className="flex justify-end">
        {recording ? (
          <span />
        ) : rightNode !== undefined ? (
          rightNode
        ) : (
          <RailButton icon={<Check size={20} />} label={doneLabel} accent={accent} />
        )}
      </div>
    </div>
  );
}

/** Directional "next step" button — after a capture, points the user to the Notes screen. */
function NotesNextButton({ accent }: { accent: Accent }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        className="flex h-[52px] items-center gap-1.5 rounded-2xl px-4"
        style={{ border: `1px solid ${accent}`, background: `color-mix(in srgb, ${accent} 20%, transparent)`, color: accent }}
      >
        <StickyNote size={18} />
        <span className="text-[13px] font-semibold">Notes</span>
        <ChevronRight size={16} />
      </button>
      <span className={`text-[9px] ${mono}`} style={{ color: MUTED }}>
        Next step
      </span>
    </div>
  );
}

function PinSheet({ accent }: { accent: Accent }) {
  return (
    <div
      className={`absolute inset-x-2 bottom-2 z-40 rounded-2xl ${glass} p-4`}
      style={{ borderColor: GLASS_BORDER }}
    >
      <p className={`mb-3 text-[11px] ${mono}`} style={{ color: MUTED }}>
        Attach to this point
      </p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Photo", icon: <Camera size={18} /> },
          { label: "File", icon: <FileText size={18} /> },
          { label: "Note", icon: <TypeIcon size={18} /> },
        ].map((o) => (
          <button
            key={o.label}
            className={`flex h-16 flex-col items-center justify-center gap-1 rounded-xl ${glass} text-[10px]`}
            style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}
          >
            <span style={{ color: accent }}>{o.icon}</span>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- screen A */

type SiteState = "live" | "captured" | "pin" | "markup" | "ghost" | "angle" | "exit";

function SiteWalk({ state }: { state: SiteState }) {
  const accent = GREEN;
  const captured = state === "captured" || state === "pin" || state === "markup";
  const markup = state === "markup";
  const ghost = state === "ghost";
  const angle = state === "angle";
  const exiting = state === "exit";
  return (
    <div
      className="relative overflow-hidden rounded-[28px] border"
      style={{ width: FRAME_W, height: FRAME_H, background: CANVAS, borderColor: "#1f2733" }}
    >
      <CameraStage accent={accent} />
      <AccentHairline accent={accent} />
      <TopBar
        accent={accent}
        backLabel="Back"
        title="STOP 4 · LOBBY"
        rightLabel="End Walk"
        rightIcon={<Check size={13} />}
      />

      {/* status row — the Shots chip opens the filmstrip / shot tray */}
      <div className="absolute inset-x-3 top-[68px] z-20 flex gap-2">
        <button className={`flex items-center gap-1.5 rounded-[10px] ${glass} px-2 py-1`} style={{ borderColor: GLASS_BORDER }}>
          <Images size={13} style={{ color: accent }} />
          <span className="font-mono text-[12px] font-semibold tabular-nums" style={{ color: accent }}>12</span>
          <span className={`text-[9px] ${mono}`} style={{ color: MUTED }}>Shots</span>
          <ChevronDown size={12} style={{ color: MUTED }} />
        </button>
      </div>

      {/* captured photo frame */}
      {captured && (
        <div className="absolute inset-x-6 top-[120px] bottom-[210px] z-10 rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          <div className="absolute inset-0" style={{ background: "linear-gradient(150deg,#243240,#101720)" }} />
          {/* example pins */}
          <span className="absolute left-[30%] top-[38%] grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full" style={{ border: `2px solid ${accent}`, background: "color-mix(in srgb, var(--graphite-canvas) 60%, transparent)" }}>
            <MapPin size={15} style={{ color: accent }} />
          </span>
          {state === "pin" && (
            <span className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ border: `1px dashed ${accent}` }} />
          )}
        </div>
      )}

      {/* right tool rail (captured only) — actual on-photo TOOLS, not the next step */}
      {captured && (
        <div className="absolute right-3 top-[150px] z-20 flex flex-col gap-3">
          <ToolButton icon={<MapPin size={20} />} label="Pin" accent={accent} active={state === "pin"} badge={1} />
          <ToolButton icon={<PenLine size={20} />} label="Markup" accent={accent} active={markup} />
          <ToolButton icon={<Plus size={20} />} label="Angle" accent={accent} />
        </div>
      )}

      {/* GHOST MODE — overlay a past photo from this spot, scrub fade, line up the next shot */}
      {ghost && (
        <>
          <div className="absolute inset-0 z-[5]" style={{ background: "linear-gradient(150deg,#2a3744,#10171f)", opacity: 0.3 }} />
          {/* user-selectable vicinity — GPS floors out ~5ft; "Pin" = plan-anchored precision */}
          <div className="absolute inset-x-3 bottom-[272px] z-20 flex items-center gap-1.5">
            <span className={`text-[10px] ${mono}`} style={{ color: MUTED }}>Vicinity</span>
            {["Pin", "5 ft", "15 ft", "30 ft"].map((v) => (
              <span key={v} className={`rounded-full px-2.5 py-0.5 text-[10px] ${mono}`} style={v === "5 ft" ? { background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent, border: `1px solid ${accent}` } : { color: MUTED, border: `1px solid ${GLASS_BORDER}` }}>
                {v}
              </span>
            ))}
          </div>

          {/* past photos to pick from — POOLED ACROSS EVERY WALK IN THE PROJECT */}
          <div className="absolute inset-x-3 bottom-[232px] z-20">
            <div className="mb-1 flex items-center justify-between">
              <span className={`text-[10px] ${mono}`} style={{ color: accent }}>Past photos near you</span>
              <span className={`text-[9px] ${mono}`} style={{ color: MUTED }}>5 within 25 ft · 6 walks</span>
            </div>
            <div className="flex gap-2 overflow-hidden">
              {[
                { d: "8 ft", t: "Today", on: false },
                { d: "12 ft", t: "Mar 3", on: true },
                { d: "12 ft", t: "Feb 10", on: false },
                { d: "15 ft", t: "Jan 6", on: false },
              ].map((p, i) => (
                <div key={i} className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-lg border" style={{ borderColor: p.on ? accent : GLASS_BORDER, outline: p.on ? `2px solid ${accent}` : "none", outlineOffset: -2 }}>
                  <div className="absolute inset-0" style={{ background: "linear-gradient(150deg,#2c3a48,#141c26)" }} />
                  <span className="absolute bottom-0 inset-x-0 px-1 py-0.5 text-[7px] leading-tight" style={{ background: "rgba(11,15,21,0.72)", color: "#E8EDF3" }}>{p.d} · {p.t}</span>
                </div>
              ))}
            </div>
          </div>
          {/* confirm the selected photo + angle-match hint (uses heading + tilt metadata) */}
          <div className="absolute inset-x-3 bottom-[196px] z-20 flex items-center gap-2">
            <span className={`flex items-center gap-1.5 rounded-full ${glass} px-2.5 py-1 text-[10px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>
              <ArrowLeftRight size={11} style={{ color: accent }} /> Rotate 8°
              <span style={{ color: MUTED }}>·</span> Level ✓
            </span>
            <button className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-[11px] font-semibold" style={{ background: accent, color: "#0B0F15" }}>
              <Check size={13} /> Use this photo
            </button>
          </div>
          {/* fade / opacity slider */}
          <div className="absolute inset-x-3 bottom-[164px] z-20 flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: "color-mix(in srgb, var(--graphite-canvas) 70%, transparent)", border: `1px solid ${GLASS_BORDER}`, backdropFilter: "blur(8px)" }}>
            <SlidersHorizontal size={13} style={{ color: accent }} />
            <span className={`text-[10px] ${mono}`} style={{ color: MUTED }}>Fade</span>
            <span className="relative h-1 flex-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
              <span className="absolute inset-y-0 left-0 w-[45%] rounded-full" style={{ background: accent }} />
              <span className="absolute -top-1 left-[45%] h-3 w-3 -translate-x-1/2 rounded-full" style={{ background: accent }} />
            </span>
            <span className="font-mono text-[10px] tabular-nums" style={{ color: "#E8EDF3" }}>45%</span>
          </div>
        </>
      )}

      {/* ADD ANGLE — dimmed reference photo behind the live camera + angle strip */}
      {angle && (
        <>
          <div className="absolute inset-x-6 top-[120px] bottom-[210px] z-[5] overflow-hidden rounded-2xl border" style={{ borderColor: GLASS_BORDER, opacity: 0.4 }}>
            <div className="absolute inset-0" style={{ background: "linear-gradient(150deg,#243240,#101720)" }} />
          </div>
          <div className="absolute inset-x-3 bottom-[196px] z-20 flex gap-2">
            {["Main", "Angle 1", "+ Angle"].map((a, i) => (
              <span key={a} className={`rounded-lg ${glass} px-2.5 py-1.5 text-[10px] ${mono}`} style={i === 2 ? { borderColor: accent, color: accent } : { borderColor: GLASS_BORDER, color: "#E8EDF3" }}>{a}</span>
            ))}
          </div>
        </>
      )}

      {/* guidance */}
      <div className="absolute inset-x-0 bottom-[124px] z-20 flex justify-center">
        <GuidanceChip
          text={
            state === "pin"
              ? "Tap where this file belongs"
              : ghost
              ? "Pick a past photo, match the angle, then capture"
              : angle
              ? "Frame the same subject from a new angle"
              : captured
              ? "Shutter for another photo, or Notes → for this stop's details"
              : "Tap to capture"
          }
        />
      </div>

      {/* NOTE: walks-with-plans is a SEPARATE full-screen plan screen launched from a
          project — not a toggle inside capture. No Plan button belongs here. */}

      {/* markup toolbar — slides in from top when Markup tool is active */}
      {markup && (
        <div className="absolute inset-x-0 top-[120px] z-30 flex justify-center">
          <div className={`flex items-center gap-1.5 rounded-2xl ${glass} px-2 py-1.5`} style={{ borderColor: accent }}>
            {[
              { icon: <PenLine size={17} />, on: true },
              { icon: <Square size={17} />, on: false },
              { icon: <CircleIcon size={17} />, on: false },
              { icon: <ArrowUpRight size={17} />, on: false },
              { icon: <TypeIcon size={17} />, on: false },
            ].map((t, i) => (
              <button key={i} className="grid h-9 w-9 place-items-center rounded-lg" style={t.on ? { background: `color-mix(in srgb, ${accent} 20%, transparent)`, color: accent } : { color: "#E8EDF3" }}>
                {t.icon}
              </button>
            ))}
            <span className="mx-1 h-5 w-px" style={{ background: GLASS_BORDER }} />
            {["#00E699", "#FF5A6A", "#FFFFFF"].map((c, i) => (
              <span key={c} className="h-5 w-5 rounded-full" style={{ background: c, outline: i === 0 ? `2px solid ${accent}` : "none", outlineOffset: 2 }} />
            ))}
            <span className="mx-1 h-5 w-px" style={{ background: GLASS_BORDER }} />
            <button className="grid h-9 w-9 place-items-center rounded-lg" style={{ color: "#E8EDF3" }}><Undo2 size={17} /></button>
            <button className="grid h-9 w-9 place-items-center rounded-lg" style={{ color: accent }}><Check size={18} /></button>
          </div>
        </div>
      )}

      <BottomRail
        accent={accent}
        showTorch={!markup}
        doneLabel="End Walk"
        rightNode={markup ? <span /> : captured ? <NotesNextButton accent={accent} /> : <span />}
      />
      {state === "pin" && <PinSheet accent={accent} />}

      {/* exit-confirm — leaving capture protects unsaved work */}
      {exiting && (
        <>
          <div className="absolute inset-0 z-40" style={{ background: "rgba(5,8,12,0.6)" }} />
          <div className={`absolute inset-x-6 top-1/2 z-50 -translate-y-1/2 rounded-2xl ${glass} p-5`} style={{ borderColor: GLASS_BORDER }}>
            <p className="text-[16px] font-semibold text-white">End this walk?</p>
            <p className="mt-1 text-[13px]" style={{ color: MUTED }}>12 stops · 18 photos captured. Your work is saved automatically.</p>
            <div className="mt-4 space-y-2">
              <button className="w-full rounded-xl py-3 text-[14px] font-semibold" style={{ background: accent, color: "#0B0F15" }}>Review &amp; submit</button>
              <button className={`w-full rounded-xl ${glass} py-2.5 text-[13px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>Keep capturing</button>
              <button className="w-full py-1 text-[12px]" style={{ color: "#FF8A95" }}>Discard walk</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- screen B */

type TwinState = "ready" | "recording" | "photos" | "newclip" | "warning" | "init" | "saving";

const CLIP_MAX = "3:00";

function Twin360({ state }: { state: TwinState }) {
  const accent = BLUE;
  const recording = state === "recording" || state === "warning";
  const photos = state === "photos";
  const newclip = state === "newclip";
  const warning = state === "warning";
  const ready = state === "ready";
  const init = state === "init";
  const saving = state === "saving";
  return (
    <div
      className="relative overflow-hidden rounded-[28px] border"
      style={{ width: FRAME_W, height: FRAME_H, background: CANVAS, borderColor: "#1f2733" }}
    >
      <CameraStage accent={accent} twin />

      {/* ghost overlay — auto-on for clip 2+, 10s countdown then auto-hide, extendable.
          Shows the previous clip's last frame to line up the overlap (registration). */}
      {newclip && (
        <>
          {/* faded previous-frame the user aligns to */}
          <div className="absolute inset-0 z-[5]" style={{ background: "linear-gradient(150deg,#243240,#101720)", opacity: 0.45 }} />
          <div className="absolute inset-x-7 top-[120px] bottom-[280px] z-[6] rounded-2xl border-2 border-dashed" style={{ borderColor: `color-mix(in srgb, ${accent} 55%, transparent)` }} />
          {/* header + countdown */}
          <div className="absolute inset-x-0 top-[100px] z-[7] flex justify-center">
            <span className={`flex items-center gap-2 rounded-full ${glass} px-3 py-1.5 text-[10px] ${mono}`} style={{ borderColor: accent, color: accent }}>
              <Ghost size={13} /> Ghost · auto-hides in
              <span className="font-mono text-[12px] font-bold tabular-nums">7s</span>
            </span>
          </div>
          {/* controls: opacity, extend +10s, stop */}
          <div className="absolute inset-x-0 top-[142px] z-[7] flex justify-center gap-2">
            <span className={`flex items-center gap-1 rounded-full ${glass} px-2 py-1 text-[11px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>
              <span className="px-1 text-[13px]">–</span> Opacity <span className="px-1 text-[13px]">+</span>
            </span>
            <button className={`rounded-full px-3 py-1 text-[11px] ${mono}`} style={{ background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent, border: `1px solid ${accent}` }}>
              +10s
            </button>
            <button className={`rounded-full ${glass} px-3 py-1 text-[11px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>
              Stop
            </button>
          </div>
        </>
      )}

      <AccentHairline accent={accent} />
      <TopBar
        accent={accent}
        backLabel="Cancel"
        title="FLOOR 2 SCAN"
        rightLabel="Clips 2"
        rightIcon={<Layers size={14} />}
      />

      {/* status row — the always-on instrument readout */}
      <div className="absolute inset-x-3 top-[68px] z-20 flex flex-wrap gap-2">
        {/* clip timer with MAX length — turns red as it nears the limit */}
        <div className={`flex items-center gap-1 rounded-[10px] ${glass} px-2 py-1`} style={{ borderColor: recording ? "#FF5A6A" : GLASS_BORDER }}>
          <span className="font-mono text-[12px] font-semibold tabular-nums" style={{ color: recording ? "#FF5A6A" : "#E8EDF3" }}>
            {recording ? "2:44" : "0:00"}
          </span>
          <span className="font-mono text-[11px] tabular-nums" style={{ color: MUTED }}>/ {CLIP_MAX}</span>
          <span className={`text-[9px] ${mono}`} style={{ color: MUTED }}>clip</span>
        </div>
        <MetricChip label="LiDAR" value="124k" accent={accent} good />
        <MetricChip label="Cov" value="68%" accent={accent} good />
        <MetricChip label="Track" value="GOOD" accent={accent} good />
        <MetricChip label="GPS" value="OK" accent={accent} />
      </div>

      {/* clip chips */}
      <div className="absolute inset-x-3 bottom-[252px] z-20 flex gap-2">
        {["Clip 1", recording ? "Clip 2 ●" : "Clip 2", "+ Add"].map((c, i) => (
          <span
            key={c}
            className={`rounded-[10px] ${glass} px-2.5 py-1 text-[10px] ${mono}`}
            style={i === 1 && recording ? { borderColor: accent, color: accent } : { borderColor: GLASS_BORDER, color: "#E8EDF3" }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* guidance */}
      <div className="absolute inset-x-0 bottom-[214px] z-20 flex justify-center">
        <GuidanceChip
          text={
            newclip
              ? "Overlap the last clip — line up with the ghost, then record"
              : recording
              ? "Move slowly · 0:16 to clip limit"
              : "Add as many clips as you need · Finish when done"
          }
        />
      </div>

      {/* photo plan: how many shots over how long — only in Photos mode */}
      {photos && (
        <div className="absolute inset-x-0 bottom-[190px] z-20 flex justify-center">
          <div className={`flex items-center gap-2 rounded-[12px] ${glass} px-2.5 py-1.5`} style={{ borderColor: GLASS_BORDER }}>
            <PhotoPlanField label="Shots" value="120" accent={accent} />
            <span className="text-[11px]" style={{ color: MUTED }}>over</span>
            <PhotoPlanField label="Time" value="2 min" accent={accent} />
            <span className="rounded-[8px] px-1.5 py-1 text-[10px] font-mono tabular-nums" style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}>
              ≈ 1.0/s
            </span>
          </div>
        </div>
      )}

      {/* quality lock expanded — WB / Focus / ISO behind the AE pill (ready only) */}
      {ready && (
        <div className="absolute inset-x-0 bottom-[186px] z-20 flex justify-center gap-1.5">
          {["WB", "Focus", "ISO"].map((l) => (
            <span key={l} className={`flex items-center gap-1 rounded-full ${glass} px-2.5 py-1 text-[10px] ${mono}`} style={{ borderColor: accent, color: accent }}>
              <Lock size={11} /> {l}
            </span>
          ))}
        </div>
      )}

      {/* mode row: Video|Photos + AE lock */}
      <div className="absolute inset-x-0 bottom-[150px] z-20 flex items-center justify-center gap-2">
        <div className={`flex items-center rounded-full ${glass} p-1`} style={{ borderColor: GLASS_BORDER }}>
          {["Video", "Photos"].map((m) => {
            const on = (m === "Photos") === photos;
            return (
              <span
                key={m}
                className={`rounded-full px-3.5 py-1 text-[10px] ${mono}`}
                style={on ? { background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent } : { color: MUTED }}
              >
                {m}
              </span>
            );
          })}
        </div>
        <button
          className={`flex items-center gap-1 rounded-[10px] ${glass} px-2.5 py-1.5`}
          style={{ borderColor: accent, background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent }}
        >
          <Lock size={13} />
          <span className={`text-[10px] ${mono}`}>AE</span>
        </button>
      </div>

      {/* ARKit init — never a blank black stage while spatial tracking boots */}
      {init && (
        <div className="absolute inset-0 z-[15] flex flex-col items-center justify-center gap-3" style={{ background: "color-mix(in srgb, var(--graphite-canvas) 55%, transparent)", backdropFilter: "blur(2px)" }}>
          <Loader2 size={30} style={{ color: accent }} className="animate-spin" />
          <span className="text-[14px] font-medium text-white">Initializing spatial tracking…</span>
          <span className="text-[11px]" style={{ color: MUTED }}>Move the phone slowly to map the space</span>
        </div>
      )}

      {/* saving / uploading clip overlay */}
      {saving && (
        <div className="absolute inset-0 z-[15] flex flex-col items-center justify-center gap-3" style={{ background: "color-mix(in srgb, var(--graphite-canvas) 60%, transparent)", backdropFilter: "blur(2px)" }}>
          <Loader2 size={30} style={{ color: accent }} className="animate-spin" />
          <span className="text-[14px] font-medium text-white">Saving clip…</span>
          <div className="h-2 w-[200px] overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full" style={{ width: "64%", background: accent }} />
          </div>
          <span className="font-mono text-[11px] tabular-nums" style={{ color: MUTED }}>Uploading · 64%</span>
        </div>
      )}

      {/* safety banner — thermal / battery / disk warnings slide in below status */}
      {warning && (
        <div className="absolute inset-x-3 top-[104px] z-20 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "color-mix(in srgb, #FF5A6A 22%, var(--graphite-canvas))", border: "1px solid #FF5A6A" }}>
          <AlertTriangle size={15} style={{ color: "#FF8A95" }} />
          <span className="text-[12px] font-medium text-white">Device warming — finish this clip soon</span>
        </div>
      )}

      <BottomRail
        accent={accent}
        recording={recording}
        showTorch
        doneLabel="Finish"
        coverage={newclip ? undefined : 0.68}
        rightNode={recording ? <span /> : <TwinFinishButton accent={accent} />}
      />
    </div>
  );
}

/** Twin "finish capturing → next step" button; leads to the processing/estimate screen. */
function TwinFinishButton({ accent }: { accent: Accent }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        className="flex h-[52px] items-center gap-1.5 rounded-2xl px-4"
        style={{ border: `1px solid ${accent}`, background: `color-mix(in srgb, ${accent} 20%, transparent)`, color: accent }}
      >
        <Check size={17} />
        <span className="text-[13px] font-semibold">Finish</span>
        <ChevronRight size={16} />
      </button>
      <span className={`text-[9px] ${mono}`} style={{ color: MUTED }}>
        Next step
      </span>
    </div>
  );
}

/* -------------------------------------------------- screen: Notes / Part 2 */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={`mb-1.5 text-[10px] ${mono}`} style={{ color: MUTED }}>
      {children}
    </p>
  );
}

/** The screen a user lands on AFTER a capture. Every field optional — photo-only is valid. */
function NotesScreen() {
  const accent = GREEN;
  return (
    <div
      className="relative overflow-hidden rounded-[28px] border"
      style={{ width: FRAME_W, height: FRAME_H, background: CANVAS, borderColor: "#1f2733" }}
    >
      <AccentHairline accent={accent} />
      <TopBar
        accent={accent}
        backLabel="Back"
        title="STOP 4 · DETAILS"
        rightLabel="Skip"
        rightIcon={<X size={13} />}
      />

      {/* captured photo hero — larger, fills the top */}
      <div className="absolute inset-x-4 top-[68px] h-[210px] z-10 overflow-hidden rounded-2xl border border-white/10">
        <div className="absolute inset-0" style={{ background: "linear-gradient(150deg,#243240,#101720)" }} />
        <span className="absolute left-[30%] top-[42%] grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full" style={{ border: `2px solid ${accent}`, background: "color-mix(in srgb, var(--graphite-canvas) 60%, transparent)" }}>
          <MapPin size={14} style={{ color: accent }} />
        </span>
        <span className={`absolute bottom-2 left-2 rounded-[8px] ${glass} px-2 py-0.5 text-[10px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>
          1 photo · 1 pin
        </span>
        <span className={`absolute bottom-2 right-2 rounded-[8px] ${glass} px-2 py-0.5 text-[10px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: accent }}>
          + Add angle
        </span>
      </div>

      {/* fields — fill the body */}
      <div className="absolute inset-x-4 top-[294px] bottom-[156px] z-10 space-y-3.5 overflow-hidden">
        <div>
          <FieldLabel>Stop name · optional</FieldLabel>
          <div className={`rounded-xl ${glass} px-3 py-3 text-[14px]`} style={{ borderColor: GLASS_BORDER, color: "#6B7889" }}>
            e.g. Kitchen — north wall
          </div>
        </div>

        {/* NOTES with voice-to-text (dictation) + AI boost */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className={`text-[10px] ${mono}`} style={{ color: MUTED }}>Notes · optional</span>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}>
                <Mic size={12} /> Dictate
              </button>
              <button className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}>
                <Sparkles size={12} /> AI boost
              </button>
            </div>
          </div>
          <div className={`h-[118px] rounded-xl ${glass} px-3 py-3 text-[14px] leading-relaxed`} style={{ borderColor: GLASS_BORDER, color: "#6B7889" }}>
            Tap <span style={{ color: accent }}>Dictate</span> to speak your notes (voice-to-text), or type
            here. Then tap <span style={{ color: accent }}>AI boost</span> to clean up and format.
          </div>
        </div>

        {/* VOICE MEMO — a recorded clip, with playback to verify */}
        <div>
          <FieldLabel>Voice memo · optional</FieldLabel>
          <div className={`flex items-center gap-3 rounded-xl ${glass} px-3 py-2.5`} style={{ borderColor: GLASS_BORDER }}>
            <button className="grid h-9 w-9 place-items-center rounded-full" style={{ background: accent, color: "#0B0F15" }}>
              <Play size={16} />
            </button>
            <div className="flex flex-1 items-center gap-[3px]">
              {[7, 12, 9, 16, 11, 6, 14, 10, 18, 8, 13, 9, 15, 7, 11, 6, 12, 9, 5].map((h, i) => (
                <span key={i} className="w-[3px] rounded-full" style={{ height: h, background: i < 7 ? accent : `color-mix(in srgb, ${MUTED} 60%, transparent)` }} />
              ))}
            </div>
            <span className="font-mono text-[11px] tabular-nums" style={{ color: "#E8EDF3" }}>0:14</span>
            <RotateCcw size={15} style={{ color: MUTED }} />
            <Trash2 size={15} style={{ color: MUTED }} />
          </div>
        </div>

        <div>
          <FieldLabel>Quick tag · optional</FieldLabel>
          <div className="flex gap-2">
            {["Observation", "Issue", "Task"].map((t, i) => (
              <span key={t} className={`rounded-full ${glass} px-3 py-1.5 text-[11px] ${mono}`} style={i === 1 ? { borderColor: accent, color: accent, background: `color-mix(in srgb, ${accent} 16%, transparent)` } : { borderColor: GLASS_BORDER, color: MUTED }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* dock: the advance button + end walk */}
      <div className="absolute inset-x-4 bottom-6 z-20 space-y-2.5">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold"
          style={{ background: accent, color: "#0B0F15" }}
        >
          Save &amp; next stop <Plus size={16} />
        </button>
        <button className={`w-full rounded-2xl ${glass} py-3 text-[13px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>
          End Walk
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------- screen: Pin / embed a file */

/** What "add a pin / embed a file" looks like — the pin detail card after tap-to-place. */
function PinEmbedScreen() {
  const accent = GREEN;
  return (
    <div
      className="relative overflow-hidden rounded-[28px] border"
      style={{ width: FRAME_W, height: FRAME_H, background: CANVAS, borderColor: "#1f2733" }}
    >
      <AccentHairline accent={accent} />
      <TopBar
        accent={accent}
        backLabel="Back"
        title="STOP 4 · PIN 1"
        rightLabel="Done"
        rightIcon={<Check size={13} />}
      />

      {/* photo with selected pin */}
      <div className="absolute inset-x-4 top-[68px] bottom-[330px] z-10 overflow-hidden rounded-2xl border border-white/10">
        <div className="absolute inset-0" style={{ background: "linear-gradient(150deg,#243240,#101720)" }} />
        <span className="absolute left-[42%] top-[44%] grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full" style={{ border: `2px solid ${accent}`, background: accent, boxShadow: `0 0 0 4px color-mix(in srgb, ${accent} 35%, transparent)` }}>
          <span className="text-[12px] font-bold text-black">1</span>
        </span>
      </div>

      {/* pin detail card */}
      <div className={`absolute inset-x-2 bottom-2 z-40 rounded-2xl ${glass} p-4`} style={{ borderColor: GLASS_BORDER }}>
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-white">
            <MapPin size={15} style={{ color: accent }} /> Pin 1
          </span>
          <X size={16} style={{ color: MUTED }} />
        </div>

        <FieldLabel>Label · optional</FieldLabel>
        <div className={`mb-3 rounded-xl ${glass} px-3 py-2 text-[13px]`} style={{ borderColor: GLASS_BORDER, color: "#6B7889" }}>
          e.g. Cracked weld at beam
        </div>

        {/* attached items — thumbnails you can tap to expand and verify */}
        <FieldLabel>Attached · tap to expand</FieldLabel>
        <div className="mb-3 flex gap-2">
          {/* uploaded photo — real thumbnail preview */}
          <div className="relative h-[68px] w-[68px] overflow-hidden rounded-xl border" style={{ borderColor: GLASS_BORDER }}>
            <div className="absolute inset-0" style={{ background: "linear-gradient(150deg,#2c3a48,#141c26)" }} />
            <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-md" style={{ background: "rgba(11,15,21,0.7)", color: "#E8EDF3" }}>
              <Maximize2 size={11} />
            </span>
            <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded px-1 text-[8px]" style={{ background: "rgba(11,15,21,0.7)", color: "#E8EDF3" }}>
              <ImageIcon size={8} /> JPG
            </span>
          </div>
          {/* uploaded file — PDF tile */}
          <div className="relative grid h-[68px] w-[68px] place-items-center rounded-xl border" style={{ borderColor: GLASS_BORDER, background: `color-mix(in srgb, ${accent} 10%, transparent)` }}>
            <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-md" style={{ background: "rgba(11,15,21,0.7)", color: "#E8EDF3" }}>
              <Maximize2 size={11} />
            </span>
            <FileText size={22} style={{ color: accent }} />
            <span className="absolute bottom-1 left-1 rounded px-1 text-[8px]" style={{ background: "rgba(11,15,21,0.7)", color: "#E8EDF3" }}>PDF</span>
          </div>
          {/* add another */}
          <button className={`grid h-[68px] w-[68px] place-items-center rounded-xl border border-dashed`} style={{ borderColor: GLASS_BORDER, color: MUTED }}>
            <Plus size={20} />
          </button>
        </div>

        {/* attach actions — no voice on pins (voice lives in stop Notes) */}
        <FieldLabel>Add to this pin</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Camera size={16} />, label: "Photo" },
            { icon: <FileText size={16} />, label: "File" },
            { icon: <TypeIcon size={16} />, label: "Note" },
          ].map((o) => (
            <button key={o.label} className={`flex h-[52px] flex-col items-center justify-center gap-1 rounded-xl ${glass} text-[10px]`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>
              <span style={{ color: accent }}>{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------- screen: Twin processing / submit */

function SubmitSection({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`text-[10px] ${mono}`} style={{ color: MUTED }}>{title}</span>
        {note ? <span className="text-[9px]" style={{ color: MUTED }}>{note}</span> : null}
      </div>
      {children}
    </div>
  );
}

/** After Finish: aggregate all clips, add phone data, choose context, see live cost + time. */
function TwinSubmitScreen({ saving }: { saving?: boolean }) {
  const accent = BLUE;
  return (
    <div
      className="relative overflow-hidden rounded-[28px] border"
      style={{ width: FRAME_W, height: FRAME_H, background: CANVAS, borderColor: "#1f2733" }}
    >
      <AccentHairline accent={accent} />
      <TopBar
        accent={accent}
        backLabel="Back"
        title="PROCESS SCAN"
        rightLabel="Close"
        rightIcon={<X size={13} />}
      />

      <div className="absolute inset-x-4 top-[64px] bottom-[222px] z-10 space-y-4 overflow-hidden">
        {/* aggregated capture summary — all clips combined */}
        <div className={`rounded-2xl ${glass} p-3`} style={{ borderColor: GLASS_BORDER }}>
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-white">Scan ready to process</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${mono}`} style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}>
              3 clips
            </span>
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
            All clips combined · LiDAR depth · 0:42 total · GPS ✓
          </p>
          <div className="mt-2 flex gap-1.5">
            {["Clip 1", "Clip 2", "Clip 3", "LiDAR"].map((c, i) => (
              <span key={c} className="relative h-10 flex-1 overflow-hidden rounded-lg border" style={{ borderColor: GLASS_BORDER, background: i === 3 ? `color-mix(in srgb, ${accent} 14%, transparent)` : "linear-gradient(150deg,#2c3a48,#141c26)" }}>
                <span className="absolute bottom-0.5 left-1 text-[8px]" style={{ color: "#E8EDF3" }}>{c}</span>
              </span>
            ))}
          </div>
        </div>

        {/* add files — one general zone, no file-type jargon */}
        <SubmitSection title="Add files · optional">
          <button className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed py-5`} style={{ borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`, background: `color-mix(in srgb, ${accent} 7%, transparent)` }}>
            <UploadCloud size={26} style={{ color: accent }} />
            <span className="text-[13px] font-semibold text-white">Add photos, videos, or files</span>
            <span className="text-[11px]" style={{ color: MUTED }}>From your phone, camera roll, or SlateDrop</span>
          </button>
          <div className="mt-2 flex gap-2">
            {["Camera roll", "Files", "SlateDrop"].map((s) => (
              <span key={s} className={`flex-1 rounded-lg ${glass} py-1.5 text-center text-[11px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>
                {s}
              </span>
            ))}
          </div>
        </SubmitSection>

        {/* quality */}
        <SubmitSection title="Quality">
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: "Draft", t: "~3 min" },
              { l: "Standard", t: "~12 min" },
              { l: "High", t: "~25 min" },
            ].map((q, i) => (
              <button key={q.l} className={`rounded-xl ${glass} py-2`} style={i === 1 ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 16%, transparent)` } : { borderColor: GLASS_BORDER }}>
                <p className="text-[12px] font-semibold" style={{ color: i === 1 ? accent : "#E8EDF3" }}>{q.l}</p>
                <p className="font-mono text-[10px] tabular-nums" style={{ color: MUTED }}>{q.t}</p>
              </button>
            ))}
          </div>
        </SubmitSection>

        {/* surrounding context — Google 3D Tiles, increasing increments */}
        <SubmitSection title="Surrounding context" note="Soon">
          <div className="grid grid-cols-4 gap-2">
            {["None", "½ block", "1 block", "2 blocks"].map((c, i) => (
              <button key={c} className={`rounded-xl ${glass} py-2 text-[11px] font-semibold`} style={i === 1 ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent } : { borderColor: GLASS_BORDER, color: i === 0 ? "#E8EDF3" : MUTED }}>
                {c}
              </button>
            ))}
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: MUTED }}>
            <Globe size={12} style={{ color: accent }} /> Blends Google 3D map tiles around your scan (uses GPS).
          </p>
        </SubmitSection>
      </div>

      {/* dock: live calculator (auto-updates) + process now OR save for desktop */}
      <div className="absolute inset-x-4 bottom-6 z-20 space-y-2.5">
        <div className={`flex items-center justify-between rounded-2xl ${glass} px-4 py-2.5`} style={{ borderColor: GLASS_BORDER }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Zap size={15} style={{ color: accent }} />
              <span className="font-mono text-[15px] font-semibold tabular-nums text-white">142</span>
              <span className={`text-[9px] ${mono}`} style={{ color: MUTED }}>credits</span>
            </span>
            <span className="h-4 w-px" style={{ background: GLASS_BORDER }} />
            <span className="flex items-center gap-1.5">
              <Clock size={14} style={{ color: accent }} />
              <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: "#E8EDF3" }}>~12 min</span>
            </span>
          </div>
          <span className="text-[9px]" style={{ color: MUTED }}>updates live</span>
        </div>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold"
          style={{ background: accent, color: "#0B0F15" }}
        >
          Start processing <ChevronRight size={16} />
        </button>
        <button className={`flex w-full items-center justify-center gap-2 rounded-2xl ${glass} py-3 text-[13px] font-semibold`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>
          <Monitor size={15} style={{ color: accent }} /> Save for later — finish on desktop
        </button>
        <p className="text-center text-[10px]" style={{ color: MUTED }}>
          Saved to SlateDrop · add more files &amp; submit from your computer anytime
        </p>
      </div>

      {/* save destination — a fast, obvious choice shown when they tap Save for later */}
      {saving && (
        <>
          <div className="absolute inset-0 z-30" style={{ background: "rgba(5,8,12,0.55)" }} />
          <div className={`absolute inset-x-2 bottom-2 z-40 rounded-2xl ${glass} p-4`} style={{ borderColor: GLASS_BORDER }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-white">Save draft to…</span>
              <X size={16} style={{ color: MUTED }} />
            </div>
            {[
              { icon: <Folder size={18} />, title: "Riverside Tower", sub: "This project · recommended", rec: true },
              { icon: <ChevronDown size={18} />, title: "Choose another project", sub: "Pick from your projects", rec: false },
              { icon: <User size={18} />, title: "My drafts", sub: "Personal · not tied to a project", rec: false },
            ].map((o) => (
              <button
                key={o.title}
                className={`mb-2 flex w-full items-center gap-3 rounded-xl ${glass} p-3 text-left`}
                style={o.rec ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` } : { borderColor: GLASS_BORDER }}
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}>
                  {o.icon}
                </span>
                <span className="flex-1">
                  <span className="block text-[13px] font-semibold text-white">{o.title}</span>
                  <span className="block text-[11px]" style={{ color: MUTED }}>{o.sub}</span>
                </span>
                <ChevronRight size={16} style={{ color: o.rec ? accent : MUTED }} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------ screen: Site Walk review */

function WalkReviewScreen() {
  const accent = GREEN;
  return (
    <div className="relative overflow-hidden rounded-[28px] border" style={{ width: FRAME_W, height: FRAME_H, background: CANVAS, borderColor: "#1f2733" }}>
      <AccentHairline accent={accent} />
      <TopBar accent={accent} backLabel="Back" title="WALK REVIEW" rightLabel="Share" rightIcon={<Share2 size={13} />} />

      <div className="absolute inset-x-4 top-[72px] z-10 flex gap-2">
        {[["12", "Stops"], ["18", "Photos"], ["5", "Pins"], ["3", "Notes"]].map(([v, l]) => (
          <div key={l} className={`flex-1 rounded-xl ${glass} py-2 text-center`} style={{ borderColor: GLASS_BORDER }}>
            <p className="font-mono text-[16px] font-semibold tabular-nums" style={{ color: accent }}>{v}</p>
            <p className={`text-[9px] ${mono}`} style={{ color: MUTED }}>{l}</p>
          </div>
        ))}
      </div>

      <div className="absolute inset-x-4 top-[140px] bottom-[150px] z-10 overflow-hidden">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl border" style={{ borderColor: GLASS_BORDER }}>
              <div className="absolute inset-0" style={{ background: `linear-gradient(150deg,#243240,#10171f)` }} />
              <span className={`absolute left-1 top-1 rounded px-1 text-[9px] ${mono}`} style={{ background: "rgba(11,15,21,0.7)", color: "#E8EDF3" }}>Stop {i + 1}</span>
              {i % 2 === 0 && (
                <span className="absolute bottom-1 right-1 grid h-4 w-4 place-items-center rounded-full" style={{ background: accent }}>
                  <MapPin size={9} style={{ color: "#0B0F15" }} />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-6 z-20 space-y-2.5">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold" style={{ background: accent, color: "#0B0F15" }}>
          Submit walk <Check size={16} />
        </button>
        <button className={`w-full rounded-2xl ${glass} py-3 text-[13px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>
          Keep capturing
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------- screen: Twin processing/done */

function TwinProcessingScreen({ done }: { done?: boolean }) {
  const accent = BLUE;
  return (
    <div className="relative overflow-hidden rounded-[28px] border" style={{ width: FRAME_W, height: FRAME_H, background: CANVAS, borderColor: "#1f2733" }}>
      <AccentHairline accent={accent} />
      <TopBar accent={accent} backLabel="Back" title={done ? "TWIN READY" : "PROCESSING"} rightLabel="Twins" rightIcon={<ChevronDown size={13} />} />

      {/* model preview */}
      <div className="absolute inset-x-4 top-[72px] h-[300px] z-10 overflow-hidden rounded-2xl border" style={{ borderColor: GLASS_BORDER }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 30%, #1d2a38, #0b1019)" }} />
        <svg className="absolute inset-0 h-full w-full opacity-30" preserveAspectRatio="none">
          <defs><pattern id="pmesh" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M0 0 L26 0 M0 0 L0 26" stroke={accent} strokeWidth="0.6" fill="none" /></pattern></defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pmesh)" />
        </svg>
        {!done && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 size={28} style={{ color: accent }} className="animate-spin" />
            <span className="text-[13px] font-medium text-white">Building your twin…</span>
            <span className="font-mono text-[11px] tabular-nums" style={{ color: MUTED }}>42% · ~7 min left</span>
          </div>
        )}
        {done && (
          <span className={`absolute bottom-2 left-2 flex items-center gap-1 rounded-[8px] ${glass} px-2 py-0.5 text-[10px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: accent }}>
            <CheckCircle2 size={11} /> Model ready · 2.4M splats
          </span>
        )}
      </div>

      {/* status / progress */}
      {!done ? (
        <div className="absolute inset-x-4 top-[392px] z-10">
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full" style={{ width: "42%", background: accent }} />
          </div>
          <p className="mt-2 text-[11px]" style={{ color: MUTED }}>You can close this — we&apos;ll notify you when it&apos;s ready.</p>
        </div>
      ) : (
        <div className="absolute inset-x-4 top-[392px] z-10 space-y-2">
          <p className={`text-[10px] ${mono}`} style={{ color: MUTED }}>Floor 2 · Riverside Tower</p>
          <p className="text-[14px] text-white">Interior + exterior · downloadable · shareable on web &amp; device.</p>
        </div>
      )}

      {/* actions */}
      <div className="absolute inset-x-4 bottom-6 z-20 space-y-2.5">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold" style={{ background: done ? accent : "rgba(255,255,255,0.08)", color: done ? "#0B0F15" : MUTED }}>
          <Eye size={16} /> View twin
        </button>
        <div className="grid grid-cols-2 gap-2.5">
          <button className={`flex items-center justify-center gap-2 rounded-2xl ${glass} py-3 text-[13px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: done ? "#E8EDF3" : MUTED }}>
            <Download size={15} /> Download
          </button>
          <button className={`flex items-center justify-center gap-2 rounded-2xl ${glass} py-3 text-[13px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: done ? "#E8EDF3" : MUTED }}>
            <Share2 size={15} /> Share link
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------ screen: walk-with-plans (full) */

function PlanWalkScreen({ dropping, clean, search }: { dropping?: boolean; clean?: boolean; search?: boolean }) {
  const accent = GREEN;
  return (
    <div className="relative overflow-hidden rounded-[28px] border" style={{ width: FRAME_W, height: FRAME_H, background: CANVAS, borderColor: "#1f2733" }}>
      <AccentHairline accent={accent} />
      <TopBar accent={accent} backLabel="Back" title="A-101 · LEVEL 2 ▾" rightLabel="End Walk" rightIcon={<Check size={13} />} />

      {/* toolbar: search (expandable) + clean/pinned layer toggle */}
      <div className="absolute inset-x-3 top-[68px] z-20 flex items-center gap-2">
        {search ? (
          <div className={`flex flex-1 items-center gap-2 rounded-full ${glass} px-3 py-1.5`} style={{ borderColor: accent }}>
            <Search size={13} style={{ color: accent }} />
            <span className="text-[12px]" style={{ color: "#6B7889" }}>Search sheets &amp; items — e.g. &ldquo;RTU-3&rdquo;</span>
          </div>
        ) : (
          <button className={`flex items-center gap-1.5 rounded-full ${glass} px-3 py-1.5 text-[11px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>
            <Search size={13} style={{ color: accent }} /> Search
          </button>
        )}
        <button className={`flex items-center gap-1.5 rounded-full ${glass} px-3 py-1.5 text-[11px] ${mono}`} style={clean ? { borderColor: accent, color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` } : { borderColor: GLASS_BORDER, color: "#E8EDF3" }}>
          <Layers size={13} /> {clean ? "Clean" : "Pinned"}
        </button>
      </div>

      {/* full-screen plan sheet — centered, zoomable, pannable (Leaflet) */}
      <div className="absolute inset-x-3 top-[104px] bottom-[150px] z-10 overflow-hidden rounded-2xl border" style={{ borderColor: GLASS_BORDER, background: "#0d141c" }}>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 460" preserveAspectRatio="xMidYMid meet">
          <g stroke="#39506a" strokeWidth="1.4" fill="none">
            <rect x="24" y="40" width="252" height="380" />
            <line x1="24" y1="180" x2="170" y2="180" />
            <line x1="170" y1="40" x2="170" y2="300" />
            <line x1="170" y1="300" x2="276" y2="300" />
            <line x1="100" y1="300" x2="100" y2="420" />
          </g>
          {/* pins hidden in CLEAN mode so hundreds of pins don't bury the sheet */}
          {!clean && [[70, 110, "1"], [210, 120, "2"], [120, 240, "3"], [60, 360, "4"], [230, 380, "5"]].map(([x, y, n]) => (
            <g key={n as string}>
              <circle cx={x as number} cy={y as number} r="11" fill={accent} stroke="#0B0F15" strokeWidth="1.5" />
              <text x={x as number} y={(y as number) + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0B0F15">{n}</text>
            </g>
          ))}
          {dropping && <circle cx="150" cy="200" r="13" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="4 3" />}
        </svg>
        {/* zoom controls */}
        <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-lg" style={{ border: `1px solid ${GLASS_BORDER}` }}>
          <button className="grid h-8 w-8 place-items-center text-[16px]" style={{ background: "rgba(11,15,21,0.7)", color: "#E8EDF3" }}>+</button>
          <button className="grid h-8 w-8 place-items-center text-[16px]" style={{ background: "rgba(11,15,21,0.7)", color: "#E8EDF3", borderTop: `1px solid ${GLASS_BORDER}` }}>−</button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[150px] z-20 flex justify-center">
        <GuidanceChip text={dropping ? "Pin dropped — capture, upload a photo, or add a 360°" : "Long-press the plan to drop a pin and capture"} />
      </div>

      {/* stops timeline — expandable, out of the way (records each pin/stop as you go) */}
      <div className="absolute inset-x-3 bottom-[112px] z-20">
        <div className={`flex items-center gap-2 rounded-full ${glass} px-3 py-1`} style={{ borderColor: GLASS_BORDER }}>
          <span className={`text-[10px] ${mono}`} style={{ color: accent }}>Stops 5 ▴</span>
          <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
            {["1", "2", "3", "4", "5"].map((s) => (
              <span key={s} className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold" style={{ background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* horizontal PAGE strip — navigate all sheets; prev/next on the ends */}
      <div className="absolute inset-x-3 bottom-6 z-20 flex items-center gap-2">
        <button className={`grid h-12 w-9 shrink-0 place-items-center rounded-lg ${glass}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}><ArrowLeft size={16} /></button>
        <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
          {["A-100", "A-101", "A-102", "A-103", "S-201", "M-301"].map((p, i) => (
            <div key={p} className="flex flex-col items-center gap-0.5">
              <div className="relative h-10 w-10 overflow-hidden rounded-md border" style={{ borderColor: i === 1 ? accent : GLASS_BORDER, outline: i === 1 ? `2px solid ${accent}` : "none", outlineOffset: -2 }}>
                <div className="absolute inset-0" style={{ background: "#0d141c" }} />
                <div className="absolute inset-1 rounded-sm border" style={{ borderColor: "#39506a" }} />
              </div>
              <span className="font-mono text-[7px]" style={{ color: i === 1 ? accent : MUTED }}>{p}</span>
            </div>
          ))}
        </div>
        <button className={`grid h-12 w-9 shrink-0 place-items-center rounded-lg ${glass}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}><ArrowUpRight size={16} className="rotate-90" /></button>
      </div>

      {/* long-press action sheet — Capture / Upload photo / Upload 360 (360 = Pro) */}
      {dropping && (
        <>
          <div className="absolute inset-0 z-30" style={{ background: "rgba(5,8,12,0.5)" }} />
          <div className={`absolute inset-x-2 bottom-2 z-40 rounded-2xl ${glass} p-4`} style={{ borderColor: GLASS_BORDER }}>
            <p className={`mb-3 text-[11px] ${mono}`} style={{ color: MUTED }}>Add at this location</p>
            <div className="space-y-2">
              {[
                { icon: <Camera size={18} />, label: "Capture photo", sub: "Open the capture screen", lock: false },
                { icon: <ImageIcon size={18} />, label: "Upload a photo", sub: "From camera roll or files", lock: false },
                { icon: <Globe size={18} />, label: "Add a 360° photo", sub: "From a 360 camera · Pro", lock: true },
              ].map((o) => (
                <button key={o.label} className={`flex w-full items-center gap-3 rounded-xl ${glass} p-3 text-left`} style={{ borderColor: GLASS_BORDER }}>
                  <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}>{o.icon}</span>
                  <span className="flex-1">
                    <span className="block text-[13px] font-semibold text-white">{o.label}</span>
                    <span className="block text-[11px]" style={{ color: MUTED }}>{o.sub}</span>
                  </span>
                  {o.lock ? <span className={`rounded-full px-2 py-0.5 text-[9px] ${mono}`} style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}>Pro</span> : <ChevronRight size={16} style={{ color: MUTED }} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ----------------------------- screen: shared 360-on-plan viewer (stakeholder) */

function PlanShare360Screen() {
  const accent = GREEN;
  return (
    <div className="relative overflow-hidden rounded-[28px] border" style={{ width: FRAME_W, height: FRAME_H, background: CANVAS, borderColor: "#1f2733" }}>
      <AccentHairline accent={accent} />
      <TopBar accent={accent} backLabel="Plan" title="SHARED · RIVERSIDE TOWER" rightLabel="A-101 ▾" rightIcon={<MapIcon size={13} />} />

      {/* mini plan with a tapped 360 pin */}
      <div className="absolute inset-x-3 top-[68px] h-[150px] z-10 overflow-hidden rounded-2xl border" style={{ borderColor: GLASS_BORDER, background: "#0d141c" }}>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 150" preserveAspectRatio="xMidYMid meet">
          <g stroke="#39506a" strokeWidth="1.4" fill="none"><rect x="20" y="20" width="260" height="110" /><line x1="150" y1="20" x2="150" y2="130" /></g>
          {[[90, 70], [210, 90]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="9" fill={accent} stroke="#0B0F15" strokeWidth="1.5" />
          ))}
          <circle cx="90" cy="70" r="14" fill="none" stroke={accent} strokeWidth="2" />
        </svg>
        <span className={`absolute bottom-2 left-2 rounded ${glass} px-2 py-0.5 text-[9px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>Tap a pin to open its 360°</span>
      </div>

      {/* 360 viewer panel opened from the pin */}
      <div className="absolute inset-x-3 top-[230px] bottom-[80px] z-10 overflow-hidden rounded-2xl border" style={{ borderColor: GLASS_BORDER }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(140% 80% at 50% 40%, #2a3a48, #0c121a)" }} />
        {/* faux equirectangular horizon */}
        <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: "linear-gradient(90deg,transparent,#5a6b7e,transparent)" }} />
        <span className={`absolute left-2 top-2 flex items-center gap-1 rounded ${glass} px-2 py-0.5 text-[10px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: accent }}>
          <Globe size={11} /> 360° · Pin 1 · Lobby
        </span>
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {["+", "−", "⤢"].map((c) => (
            <span key={c} className="grid h-8 w-8 place-items-center rounded-full text-[14px]" style={{ background: "rgba(11,15,21,0.7)", color: "#E8EDF3", border: `1px solid ${GLASS_BORDER}` }}>{c}</span>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-6 z-20">
        <p className="text-center text-[11px]" style={{ color: MUTED }}>Stakeholders click pins across plan pages to explore attached 360s</p>
      </div>
    </div>
  );
}

/* ------------------------------------------- screen: progression / before-after */

function ProgressionScreen() {
  const accent = GREEN;
  return (
    <div className="relative overflow-hidden rounded-[28px] border" style={{ width: FRAME_W, height: FRAME_H, background: CANVAS, borderColor: "#1f2733" }}>
      <AccentHairline accent={accent} />
      <TopBar accent={accent} backLabel="Back" title="PROGRESSION" rightLabel="Share" rightIcon={<Share2 size={13} />} />

      <div className="absolute inset-x-4 top-[72px] z-10">
        <p className={`text-[10px] ${mono}`} style={{ color: MUTED }}>Lobby · north wall · 4 visits over 3 months</p>
      </div>

      {/* before / after compare with a draggable divider */}
      <div className="absolute inset-x-4 top-[98px] h-[340px] z-10 overflow-hidden rounded-2xl border" style={{ borderColor: GLASS_BORDER }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(150deg,#2c3a48,#141c26)" }} />
        <div className="absolute inset-y-0 left-0 w-[52%] overflow-hidden" style={{ borderRight: `2px solid ${accent}` }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(150deg,#1c2730,#0d141b)" }} />
        </div>
        <span className={`absolute left-2 top-2 rounded ${glass} px-1.5 py-0.5 text-[9px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>Before · Jan 6</span>
        <span className={`absolute right-2 top-2 rounded ${glass} px-1.5 py-0.5 text-[9px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: accent }}>After · Today</span>
        <span className="absolute left-[52%] top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full" style={{ background: accent }}>
          <ArrowLeftRight size={16} style={{ color: "#0B0F15" }} />
        </span>
      </div>

      {/* timeline of visits (ghost-aligned) */}
      <div className="absolute inset-x-4 top-[452px] z-10">
        <div className="mb-2 flex items-center gap-1.5">
          <Calendar size={12} style={{ color: accent }} />
          <span className={`text-[10px] ${mono}`} style={{ color: MUTED }}>Visits · ghost-aligned</span>
        </div>
        <div className="flex gap-2">
          {["Jan 6", "Feb 10", "Mar 3", "Today"].map((d, i) => (
            <div key={d} className="flex-1">
              <div className="relative h-14 overflow-hidden rounded-lg border" style={{ borderColor: i === 3 ? accent : GLASS_BORDER, outline: i === 3 ? `2px solid ${accent}` : "none", outlineOffset: -2 }}>
                <div className="absolute inset-0" style={{ background: "linear-gradient(150deg,#2c3a48,#141c26)" }} />
              </div>
              <p className="mt-1 text-center font-mono text-[9px]" style={{ color: i === 3 ? accent : MUTED }}>{d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-6 z-20 grid grid-cols-2 gap-2.5">
        <button className={`flex items-center justify-center gap-2 rounded-2xl ${glass} py-3 text-[13px] ${mono}`} style={{ borderColor: GLASS_BORDER, color: "#E8EDF3" }}>
          <ArrowLeftRight size={15} /> Slider
        </button>
        <button className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-[13px] ${mono}`} style={{ background: `color-mix(in srgb, ${accent} 18%, transparent)`, border: `1px solid ${accent}`, color: accent }}>
          <Eye size={15} /> Side-by-side
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------ screen: Twin clip review */

function TwinClipReviewScreen() {
  const accent = BLUE;
  return (
    <div className="relative overflow-hidden rounded-[28px] border" style={{ width: FRAME_W, height: FRAME_H, background: CANVAS, borderColor: "#1f2733" }}>
      <AccentHairline accent={accent} />
      <TopBar accent={accent} backLabel="Back" title="REVIEW CLIPS" rightLabel="Close" rightIcon={<X size={13} />} />

      <div className="absolute inset-x-4 top-[72px] z-10">
        <p className={`text-[10px] ${mono}`} style={{ color: MUTED }}>3 clips · one session · reorder or remove — never trim</p>
        <p className="mt-1 text-[11px]" style={{ color: "#FF8A95" }}>Clips overlap on purpose — trimming would break the overlap the solve needs.</p>
      </div>

      <div className="absolute inset-x-4 top-[124px] bottom-[100px] z-10 space-y-2.5 overflow-hidden">
        {[
          { n: "Clip 1", d: "0:42", lidar: true },
          { n: "Clip 2", d: "1:10", lidar: true },
          { n: "Clip 3", d: "0:55", lidar: true },
        ].map((c, i) => (
          <div key={c.n} className={`flex items-center gap-3 rounded-2xl ${glass} p-2.5`} style={{ borderColor: GLASS_BORDER }}>
            <span className="grid h-7 w-5 place-items-center text-[12px]" style={{ color: MUTED }}>⋮⋮</span>
            <div className="relative h-14 w-20 overflow-hidden rounded-lg" style={{ background: "linear-gradient(150deg,#243240,#101720)" }}>
              <span className="absolute bottom-1 right-1 rounded px-1 text-[9px] font-mono tabular-nums" style={{ background: "rgba(11,15,21,0.72)", color: "#E8EDF3" }}>{c.d}</span>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-white">{c.n}</p>
              <p className="flex items-center gap-1 text-[10px]" style={{ color: accent }}><Zap size={10} /> LiDAR · aligned</p>
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-lg" style={{ color: MUTED }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      <div className="absolute inset-x-4 bottom-6 z-20">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold" style={{ background: accent, color: "#0B0F15" }}>
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

/* ------------------------------------------------------------------ page */

export default function CaptureShellPreview() {
  const [site, setSite] = useState<SiteState>("captured");
  const [twin, setTwin] = useState<TwinState>("recording");
  const [save, setSave] = useState(false);
  const [twinDone, setTwinDone] = useState(true);
  const [planState, setPlanState] = useState<"plan" | "drop" | "clean" | "search">("plan");

  const seg = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.1em] ${
      active ? "bg-white/15 text-white" : "text-[#7d8a9b]"
    }`;

  return (
    <div className="min-h-screen bg-[#070a0f] px-8 py-10 text-white">
      <h1 className="mb-1 font-mono text-sm uppercase tracking-[0.2em] text-[#9fb0c3]">
        Unified Capture Shell — design harness
      </h1>
      <p className="mb-8 max-w-3xl text-sm text-[#7d8a9b]">
        One shell, two accents. Site Walk (green) and Twin 360 (blue) share identical geometry,
        glass, and control grammar — only the accent and the mode-specific controls differ. This is
        the browser-iterable source of truth the native SwiftUI Twin HUD will mirror.
      </p>

      <div className="flex flex-wrap items-start gap-12">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#9fb0c3]">Site Walk</span>
            {(["live", "captured", "pin", "markup", "ghost", "angle", "exit"] as SiteState[]).map((s) => (
              <button key={s} className={seg(site === s)} onClick={() => setSite(s)}>
                {s}
              </button>
            ))}
          </div>
          <SiteWalk state={site} />
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#9fb0c3]">Twin 360</span>
            {(["ready", "recording", "photos", "newclip", "warning", "init", "saving"] as TwinState[]).map((s) => (
              <button key={s} className={seg(twin === s)} onClick={() => setTwin(s)}>
                {s}
              </button>
            ))}
          </div>
          <Twin360 state={twin} />
        </div>
      </div>

      <div id="after" className="mt-12 mb-3 scroll-mt-4 border-t border-white/10 pt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#9fb0c3]">
          What happens after a Site Walk capture
        </p>
        <p className="mt-1 max-w-3xl text-sm text-[#7d8a9b]">
          Left: the Notes / &ldquo;Part 2&rdquo; screen the user advances to (every field optional —
          photo-only is valid; the big green button is the next step). Right: the Pin / embed-file UI
          — tap-to-place drops a numbered pin, then this card lets them label it and attach a file,
          photo, voice note, or text.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-12">
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[#9fb0c3]">
            Notes / Part 2 — after capture
          </p>
          <NotesScreen />
        </div>
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[#9fb0c3]">
            Pin / embed a file
          </p>
          <PinEmbedScreen />
        </div>
      </div>

      <div id="twin-next" className="mt-12 mb-3 scroll-mt-4 border-t border-white/10 pt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#9fb0c3]">
          Twin 360 — after Finish: the processing screen
        </p>
        <p className="mt-1 max-w-3xl text-sm text-[#7d8a9b]">
          During a walk the user adds as many clips as they need; tapping <b>Finish →</b> brings them
          here. All clips are combined automatically. They can add more phone data (360 / LiDAR / GPS /
          media), set how much surrounding Google-3D-Tiles context to blend in (increasing increments),
          pick quality, and the credit + time calculator updates live as they change anything.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-12">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#9fb0c3]">
              Process scan (tokens · time · context)
            </span>
            {([["default", false], ["save sheet", true]] as const).map(([label, v]) => (
              <button key={label} className={seg(save === v)} onClick={() => setSave(v)}>
                {label}
              </button>
            ))}
          </div>
          <TwinSubmitScreen saving={save} />
        </div>
      </div>

      <div id="screens" className="mt-12 mb-3 scroll-mt-4 border-t border-white/10 pt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#9fb0c3]">
          Review, delivery &amp; walk-with-plans screens
        </p>
        <p className="mt-1 max-w-3xl text-sm text-[#7d8a9b]">
          The screens that complete each app: Site Walk review (after End Walk), the full-screen
          walk-with-plans surface (launched from a project — the plan IS the screen), and the Twin
          delivery screen where the finished model is viewed, downloaded, and shared.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-12">
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[#9fb0c3]">Site Walk — walk review</p>
          <WalkReviewScreen />
        </div>
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#9fb0c3]">Walk with plans (full-screen · Pro)</span>
            {(["plan", "drop", "clean", "search"] as const).map((v) => (
              <button key={v} className={seg(planState === v)} onClick={() => setPlanState(v)}>
                {v}
              </button>
            ))}
          </div>
          <PlanWalkScreen dropping={planState === "drop"} clean={planState === "clean"} search={planState === "search"} />
        </div>
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[#9fb0c3]">Shared 360-on-plan (stakeholder)</p>
          <PlanShare360Screen />
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#9fb0c3]">Twin — processing &amp; delivery</span>
            {([["processing", false], ["ready", true]] as const).map(([label, v]) => (
              <button key={label} className={seg(twinDone === v)} onClick={() => setTwinDone(v)}>
                {label}
              </button>
            ))}
          </div>
          <TwinProcessingScreen done={twinDone} />
        </div>
      </div>

      <div id="ghost" className="mt-12 mb-3 scroll-mt-4 border-t border-white/10 pt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#9fb0c3]">
          Ghost mode, progression &amp; clip review
        </p>
        <p className="mt-1 max-w-3xl text-sm text-[#7d8a9b]">
          Site Walk ghost (switch the Site Walk above to <b>ghost</b>): scroll past photos taken near
          you, pick one, fade it, and line up the next shot. Progression shows the same spot
          before/after across months. Twin clip review trims/reorders clips before processing.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-12">
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[#9fb0c3]">Site Walk — progression / before-after</p>
          <ProgressionScreen />
        </div>
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[#9fb0c3]">Twin — clip review &amp; trim</p>
          <TwinClipReviewScreen />
        </div>
      </div>
    </div>
  );
}
