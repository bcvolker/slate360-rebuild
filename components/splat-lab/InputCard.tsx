"use client";

import { useState } from "react";
import { FolderOpen, Loader2, Play, Square } from "lucide-react";
import { PathBrowser } from "@/components/splat-lab/PathBrowser";
import { HelpTooltip } from "@/components/splat-lab/HelpTooltip";
import type { Knobs } from "@/lib/splat-lab/clones";

const HELP = {
  sphericalMode: "Native registers each 360 panorama once with COLMAP's own spherical camera model (the proven method, verified on this machine). Rig splits each panorama into 6 faces first — use only if Native under-registers a capture.",
  fps: "Frames extracted per second of video. 4 fps is the proven default for walking-pace 360 capture.",
  maxDuration: "Cap seconds processed per video (0 = full). Useful to sample a long mission instead of every frame.",
  removePeople: "Detects and masks people before reconstruction so they don't bake into the splat as floaters.",
};

export function InputCard({
  input,
  onChangeInput,
  knobs,
  setKnobs,
  running,
  starting,
  onRun,
  onCancel,
  error,
}: {
  input: string;
  onChangeInput: (v: string) => void;
  knobs: Knobs;
  setKnobs: (k: Knobs) => void;
  running: boolean;
  starting: boolean;
  onRun: () => void;
  onCancel: () => void;
  error: string | null;
}) {
  const [browsing, setBrowsing] = useState(false);
  const set = (patch: Partial<Knobs>) => setKnobs({ ...knobs, ...patch });

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Input</p>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => onChangeInput(e.target.value)}
          placeholder="C:\Users\Brian PC\Desktop\9.10 kitchen high and low pass"
          className="flex-1 rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-3 py-2 font-mono text-xs text-[var(--graphite-text-body)] placeholder:text-zinc-600 focus:border-[var(--twin360-blue)] focus:outline-none"
        />
        <button
          onClick={() => setBrowsing(true)}
          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-[var(--graphite-muted)] hover:text-white"
        >
          <FolderOpen className="size-3.5" /> Browse…
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      {browsing ? (
        <PathBrowser
          onPick={(p) => { onChangeInput(p); setBrowsing(false); }}
          onClose={() => setBrowsing(false)}
        />
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Toggle label="360 video" help="Input is 360 equirectangular video (X4/Avata). Off for flat drone/phone stills." value={knobs.is360} onChange={(v) => set({ is360: v })} />
        <Segment label="SfM mode" help={HELP.sphericalMode} value={knobs.sphericalMode} options={[["native", "Native"], ["rig", "Rig"]]} onChange={(v) => set({ sphericalMode: v as Knobs["sphericalMode"] })} disabled={!knobs.is360} />
        <Segment label="FPS" help={HELP.fps} value={String(knobs.fps)} options={[["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]]} onChange={(v) => set({ fps: Number(v) })} />
        <Toggle label="Remove people" help={HELP.removePeople} value={knobs.removePeople} onChange={(v) => set({ removePeople: v })} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        {!running ? (
          <button
            onClick={onRun}
            disabled={starting}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--twin360-blue)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {starting ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Run All
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-[var(--graphite-muted)] hover:text-white"
          >
            <Square className="size-3.5" /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, help, value, onChange }: { label: string; help: string; value: boolean; onChange: (v: boolean) => void }) {
  // A <button> cannot contain another <button> (HelpTooltip's own trigger)
  // without breaking hydration — the row is a div with its own click
  // handler instead, and the help icon stops propagation so it doesn't
  // also toggle the setting.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onChange(!value)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(!value); } }}
      className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-3 py-2 text-xs text-[var(--graphite-text-body)] transition hover:border-[color-mix(in_srgb,var(--twin360-blue)_40%,transparent)]"
    >
      <span className="flex items-center gap-1">
        {label}
        <span onClick={(e) => e.stopPropagation()}><HelpTooltip text={help} /></span>
      </span>
      <span className={`size-2 rounded-full transition ${value ? "bg-[var(--twin360-blue)]" : "bg-zinc-600"}`} />
    </div>
  );
}

function Segment({ label, help, value, options, onChange, disabled }: { label: string; help: string; value: string; options: [string, string][]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className={disabled ? "opacity-40" : ""}>
      <div className="flex items-center gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{label}</span>
        <HelpTooltip text={help} />
      </div>
      <div className="mt-1 flex overflow-hidden rounded-md border border-white/10">
        {options.map(([val, lbl]) => (
          <button key={val} disabled={disabled} onClick={() => onChange(val)}
            className={`flex-1 px-2 py-1.5 font-mono text-[11px] transition ${value === val ? "bg-[var(--twin360-blue)] text-white" : "bg-[var(--graphite-canvas)] text-[var(--graphite-muted)] hover:text-white"}`}>
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}
