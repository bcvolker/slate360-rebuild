"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, Square } from "lucide-react";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { SplatLabKnobs, DEFAULT_KNOBS, type Knobs } from "@/components/splat-lab/SplatLabKnobs";
import { SplatLabProgress } from "@/components/splat-lab/SplatLabProgress";
import type { SplatLabJob } from "@/lib/splat-lab/job-store";

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
      if (data.status === "completed" || data.status === "failed" || data.status === "blocked") stopPoll();
    }, 1500);
  }, [stopPoll]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const start = useCallback(async () => {
    setError(null);
    if (!input.trim()) { setError("Paste a Windows path to a video or image folder."); return; }
    setStarting(true);
    try {
      const res = await fetch("/api/splat-lab/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim(), ...knobs }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "request failed" }));
        setError(err.error ?? "request failed"); return;
      }
      const { id } = (await res.json()) as { id: string };
      setJobId(id); setJob(null); poll(id);
    } finally { setStarting(false); }
  }, [input, knobs, poll]);

  const cancel = useCallback(async () => {
    if (!jobId) return;
    await fetch(`/api/splat-lab/jobs/${jobId}`, { method: "POST" });
    stopPoll();
  }, [jobId, stopPoll]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Header />

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Input</p>
          <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
            Local · RTX 3090
          </span>
        </div>
        <div className="mt-2 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="C:\Users\Brian PC\Desktop\kitchen-capture\highpass.mp4"
            className="flex-1 rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-3 py-2 font-mono text-xs text-[var(--graphite-text-body)] placeholder:text-zinc-600 focus:border-[var(--twin360-blue)] focus:outline-none" />
          <button onClick={start} disabled={starting}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--twin360-blue)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
            {starting ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Run
          </button>
          {jobId ? (
            <button onClick={cancel} className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-[var(--graphite-muted)] hover:text-white">
              <Square className="size-3.5" /> Cancel
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-[11px] text-[var(--graphite-muted)]">
          Paste a Windows path to a 360 video file or a folder of photos. Files stay on disk — nothing is uploaded through the browser.
        </p>
        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      </div>

      <SplatLabKnobs knobs={knobs} setKnobs={setKnobs} />

      {jobId ? <SplatLabProgress job={job} jobId={jobId} /> : null}
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <Slate360Logo variant="dark" size="default" />
        <div className="h-8 w-px bg-white/10" />
        <div>
          <h1 className="text-base font-bold text-[var(--graphite-text-header)]">Splat Lab</h1>
          <p className="mt-0.5 text-xs text-[var(--graphite-muted)]">
            Gaussian-splat reconstruction — desktop quality evaluation.
          </p>
        </div>
      </div>
    </div>
  );
}
