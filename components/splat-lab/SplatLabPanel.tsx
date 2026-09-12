"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, Square, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { SplatLabProgress } from "@/components/splat-lab/SplatLabProgress";
import type { SplatLabJob } from "@/lib/splat-lab/job-store";

type Knobs = {
  is360: boolean;
  fps: number;
  removePeople: boolean;
  resolutionLimit: number;
  shDegree: number;
  maxSplatsMillions: number;
  trainingSteps: number;
  preset: string;
};

const DEFAULT_KNOBS: Knobs = {
  is360: true,
  fps: 2,
  removePeople: true,
  resolutionLimit: 1920,
  shDegree: 1,
  maxSplatsMillions: 1.5,
  trainingSteps: 7000,
  preset: "classic",
};

const PRESETS = ["classic", "lite", "object", "safe"];

export function SplatLabPanel() {
  const [input, setInput] = useState("");
  const [knobs, setKnobs] = useState<Knobs>(DEFAULT_KNOBS);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SplatLabJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const poll = useCallback((id: string) => {
    stopPoll();
    pollRef.current = window.setInterval(async () => {
      const res = await fetch(`/api/splat-lab/jobs/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as SplatLabJob;
      setJob(data);
      if (data.status === "completed" || data.status === "failed" || data.status === "blocked") {
        stopPoll();
      }
    }, 1500);
  }, [stopPoll]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const start = useCallback(async () => {
    setError(null);
    if (!input.trim()) { setError("Paste a Windows path to a video or image folder."); return; }
    setStarting(true);
    try {
      const res = await fetch("/api/splat-lab/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim(), ...knobs }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "request failed" }));
        setError(err.error ?? "request failed");
        return;
      }
      const { id } = (await res.json()) as { id: string };
      setJobId(id);
      setJob(null);
      poll(id);
    } finally {
      setStarting(false);
    }
  }, [input, knobs, poll]);

  const cancel = useCallback(async () => {
    if (!jobId) return;
    await fetch(`/api/splat-lab/jobs/${jobId}`, { method: "POST" });
    stopPoll();
  }, [jobId, poll, stopPoll]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-[var(--graphite-text-header)]">Splat Lab</h1>
          <p className="mt-1 text-xs text-[var(--graphite-muted)]">
            Local Gaussian-splat pipeline — desktop quality evaluation only.
          </p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
          Local · RTX 3090
        </span>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
        <label className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
          Input path (video file or image folder)
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="C:\Users\Brian PC\Desktop\Kitchen-AirVis-Test\X4-360-Video\highpass.mp4"
            className="flex-1 rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-3 py-2 font-mono text-xs text-[var(--graphite-text-body)] placeholder:text-zinc-600 focus:border-[var(--twin360-blue)] focus:outline-none"
          />
          <button
            onClick={start}
            disabled={starting}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--twin360-blue)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {starting ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            Run
          </button>
          {jobId ? (
            <button onClick={cancel} className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-[var(--graphite-muted)] hover:text-white">
              <Square className="size-3.5" /> Cancel
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      </div>

      <KnobPanel knobs={knobs} setKnobs={setKnobs} />

      {jobId ? <SplatLabProgress job={job} jobId={jobId} /> : null}
    </div>
  );
}

function KnobPanel({ knobs, setKnobs }: { knobs: Knobs; setKnobs: (k: Knobs) => void }) {
  const set = (patch: Partial<Knobs>) => setKnobs({ ...knobs, ...patch });
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">Training knobs</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Toggle label="360 video" value={knobs.is360} onChange={(v) => set({ is360: v })} />
        <Toggle label="Remove people" value={knobs.removePeople} onChange={(v) => set({ removePeople: v })} />
        <NumberField label="FPS" value={knobs.fps} onChange={(v) => set({ fps: v })} step={0.5} />
        <NumberField label="Res limit (px)" value={knobs.resolutionLimit} onChange={(v) => set({ resolutionLimit: v })} step={128} />
        <NumberField label="SH degree" value={knobs.shDegree} onChange={(v) => set({ shDegree: v })} step={1} min={0} max={3} />
        <NumberField label="Splats (M)" value={knobs.maxSplatsMillions} onChange={(v) => set({ maxSplatsMillions: v })} step={0.5} />
        <NumberField label="Train steps" value={knobs.trainingSteps} onChange={(v) => set({ trainingSteps: v })} step={1000} />
        <SelectField label="Preset" value={knobs.preset} options={PRESETS} onChange={(v) => set({ preset: v })} />
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-3 py-2 text-xs text-[var(--graphite-text-body)]">
      <span>{label}</span>
      <span className={cn("h-2 w-2 rounded-full", value ? "bg-[var(--twin360-blue)]" : "bg-zinc-600")} />
    </button>
  );
}

function NumberField({ label, value, onChange, step = 1, min, max }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{label}</span>
      <input type="number" value={value} step={step} min={min} max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-2 py-1.5 font-mono text-xs text-[var(--graphite-text-body)] focus:border-[var(--twin360-blue)] focus:outline-none" />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-2 py-1.5 font-mono text-xs text-[var(--graphite-text-body)] focus:border-[var(--twin360-blue)] focus:outline-none">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
