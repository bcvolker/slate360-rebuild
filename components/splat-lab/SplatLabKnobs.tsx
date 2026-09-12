"use client";

import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/splat-lab/HelpTooltip";

export type Knobs = {
  is360: boolean;
  removePeople: boolean;
  sfmMode: "faster" | "hq";
  imageSize: "auto" | "4k" | "6k" | "8k";
  fps: number;
  maxDuration: number;
  precompute360Faces: boolean;
  resolutionLimit: number;
  shDegree: number;
  maxSplatsMillions: number;
  trainingSteps: number;
  preset: string;
  quality: "test" | "medium" | "high" | "auto";
};

export const DEFAULT_KNOBS: Knobs = {
  is360: true,
  removePeople: true,
  sfmMode: "faster",
  imageSize: "auto",
  fps: 4,
  maxDuration: 0,
  precompute360Faces: true,
  resolutionLimit: 1920,
  shDegree: 1,
  maxSplatsMillions: 1.5,
  trainingSteps: 30_000,
  preset: "classic",
  quality: "auto",
};

const HELP = {
  removePeople: "Detects and masks people in each frame before reconstruction so they don't bake into the splat as floaters. Recommended ON for occupied spaces.",
  sfmMode: "Faster uses guided feature matching (minutes). HQ uses exhaustive matching (much slower, denser point cloud) — only for small captures or final quality passes.",
  imageSize: "Target frame resolution. Auto uses the full source (up to 7680 wide for 8K 360). Lower (4K) speeds up SfM a lot with minor quality loss.",
  fps: "Frames extracted per second of video. 4 fps is the proven default for walking-pace 360 capture. Higher fps = more overlap (slower) but tighter tracks.",
  maxDuration: "Cap seconds processed per video (0 = full). Useful to sample a long mission instead of processing every frame.",
  precompute360Faces: "Splits each 360 equirect frame into 6 perspective cube faces before COLMAP — the proven method, since COLMAP doesn't natively solve equirect SfM. Keep ON for 360.",
  quality: "Step target: Test=5k (quick preview), Medium=30k, High=100k, Auto=300k (final quality). Higher = sharper, denser splats, longer training.",
  trainingSteps: "Training iterations. Overridden upward by the quality preset target. 30k is a good medium-quality default; 300k for final.",
  shDegree: "Spherical harmonics degree (0-3). Higher captures view-dependent reflections (shiny surfaces). 1 is a safe default; 2-3 for highest fidelity.",
  maxSplatsMillions: "Cap on total splats. Higher = more detail + larger file. 1.5M is a web-friendly default; raise for local quality eval.",
  preset: "Training preset. Classic is the balanced default. Lite trains faster; Object for single-object scenes; Safe avoids aggressive densification.",
};

export function SplatLabKnobs({ knobs, setKnobs }: { knobs: Knobs; setKnobs: (k: Knobs) => void }) {
  const set = (patch: Partial<Knobs>) => setKnobs({ ...knobs, ...patch });
  return (
    <div className="space-y-3">
      <Section title="Prepare Images">
        <ToggleField label="Remove people" help={HELP.removePeople} value={knobs.removePeople} onChange={(v) => set({ removePeople: v })} recommended />
        <ToggleField label="360 video" help="Input is 360° equirectangular video (X4 / DJI 360). Turn off for perspective photos (drone mapping, phone stills)." value={knobs.is360} onChange={(v) => set({ is360: v })} recommended={knobs.is360} />
        {knobs.is360 ? (
          <ToggleField label="Precompute 360 faces" help={HELP.precompute360Faces} value={knobs.precompute360Faces} onChange={(v) => set({ precompute360Faces: v })} recommended={knobs.precompute360Faces} />
        ) : null}
        <SegmentField label="SfM mode" help={HELP.sfmMode} value={knobs.sfmMode} options={[["faster", "Faster"], ["hq", "HQ"]]} onChange={(v) => set({ sfmMode: v as Knobs["sfmMode"] })} recommended={knobs.sfmMode === "faster"} />
        <SegmentField label="Image size" help={HELP.imageSize} value={knobs.imageSize} options={[["auto", "Auto"], ["4k", "4K"], ["6k", "6K"], ["8k", "8K"]]} onChange={(v) => set({ imageSize: v as Knobs["imageSize"] })} recommended={knobs.imageSize === "auto"} />
        <SegmentField label="FPS" help={HELP.fps} value={String(knobs.fps)} options={[["3", "3"], ["4", "4"], ["5", "5"]]} onChange={(v) => set({ fps: Number(v) })} recommended={knobs.fps === 4} />
        <NumberField label="Max duration (s)" help={HELP.maxDuration} value={knobs.maxDuration} onChange={(v) => set({ maxDuration: v })} step={10} />
      </Section>

      <Section title="Reconstruction">
        <SegmentField label="Quality" help={HELP.quality} value={knobs.quality} options={[["test", "Test"], ["medium", "Medium"], ["high", "High"], ["auto", "Auto"]]} onChange={(v) => set({ quality: v as Knobs["quality"] })} recommended={knobs.quality === "auto"} />
        <NumberField label="Training steps" help={HELP.trainingSteps} value={knobs.trainingSteps} onChange={(v) => set({ trainingSteps: v })} step={5000} />
        <NumberField label="SH degree" help={HELP.shDegree} value={knobs.shDegree} onChange={(v) => set({ shDegree: v })} step={1} min={0} max={3} />
        <NumberField label="Max splats (M)" help={HELP.maxSplatsMillions} value={knobs.maxSplatsMillions} onChange={(v) => set({ maxSplatsMillions: v })} step={0.5} />
        <SelectField label="Preset" help={HELP.preset} value={knobs.preset} options={["classic", "lite", "object", "safe"]} onChange={(v) => set({ preset: v })} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">{title}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{label}</span>
      <HelpTooltip text={help} />
    </div>
  );
}

function Recommended() {
  return <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--graphite-primary)] drop-shadow-[0_0_6px_rgba(0,230,153,0.7)]" title="Recommended default" />;
}

function ToggleField({ label, help, value, onChange, recommended }: { label: string; help: string; value: boolean; onChange: (v: boolean) => void; recommended?: boolean }) {
  return (
    <button onClick={() => onChange(!value)} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-3 py-2 text-xs text-[var(--graphite-text-body)] transition hover:border-[color-mix(in_srgb,var(--twin360-blue)_40%,transparent)]">
      <span className="flex items-center gap-1">
        {label}
        <HelpTooltip text={help} />
        {recommended ? <Recommended /> : null}
      </span>
      <span className={cn("h-2 w-2 rounded-full transition", value ? "bg-[var(--twin360-blue)]" : "bg-zinc-600")} />
    </button>
  );
}

function SegmentField({ label, help, value, options, onChange, recommended }: { label: string; help: string; value: string; options: [string, string][]; onChange: (v: string) => void; recommended?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{label}</span>
        <HelpTooltip text={help} />
        {recommended ? <Recommended /> : null}
      </div>
      <div className="mt-1 flex overflow-hidden rounded-md border border-white/10">
        {options.map(([val, lbl]) => (
          <button key={val} onClick={() => onChange(val)}
            className={cn("flex-1 px-2 py-1.5 font-mono text-[11px] transition",
              value === val ? "bg-[var(--twin360-blue)] text-white" : "bg-[var(--graphite-canvas)] text-[var(--graphite-muted)] hover:text-white")}>
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberField({ label, help, value, onChange, step = 1, min, max }: { label: string; help: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <label className="block">
      <div className="flex items-center gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{label}</span>
        <HelpTooltip text={help} />
      </div>
      <input type="number" value={value} step={step} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-2 py-1.5 font-mono text-xs text-[var(--graphite-text-body)] focus:border-[var(--twin360-blue)] focus:outline-none" />
    </label>
  );
}

function SelectField({ label, help, value, options, onChange }: { label: string; help: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="flex items-center gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{label}</span>
        <HelpTooltip text={help} />
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-2 py-1.5 font-mono text-xs text-[var(--graphite-text-body)] focus:border-[var(--twin360-blue)] focus:outline-none">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
