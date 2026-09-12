"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import { TitleBar } from "@/components/splat-lab/TitleBar";
import { WorkspaceCard } from "@/components/splat-lab/WorkspaceCard";
import { InputCard } from "@/components/splat-lab/InputCard";
import { PrepareImagesCard } from "@/components/splat-lab/PrepareImagesCard";
import { ReconstructionCard } from "@/components/splat-lab/ReconstructionCard";
import { SplatGenerationCard } from "@/components/splat-lab/SplatGenerationCard";
import { ViewPublishCard } from "@/components/splat-lab/ViewPublishCard";
import { SettingsModal } from "@/components/splat-lab/SettingsModal";
import { JobHistoryRail } from "@/components/splat-lab/JobHistoryRail";
import { HelpSheet } from "@/components/splat-lab/HelpSheet";
import { CLONE_META, defaultsFor, knobsToRunOptions, type SplatLabClone } from "@/lib/splat-lab/clones";
import type { SplatLabJob } from "@/lib/splat-lab/job-store";

export function SplatLabPanel({ clone }: { clone: SplatLabClone }) {
  const meta = CLONE_META[clone];
  const [input, setInput] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [knobs, setKnobs] = useState(() => defaultsFor(clone));
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SplatLabJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSfm, setShowSfm] = useState(false);
  const [showLiveView, setShowLiveView] = useState(false);
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

  useEffect(() => {
    fetch("/api/splat-lab/jobs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const latest = (d.jobs as SplatLabJob[] | undefined)?.find((j) => j.clone === clone);
        if (latest && !jobId) {
          setJobId(latest.id); setJob(latest); setInput(latest.input ?? "");
          if (latest.status === "running") poll(latest.id);
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clone]);

  const selectJob = useCallback(async (id: string) => {
    stopPoll();
    const res = await fetch(`/api/splat-lab/jobs/${id}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as SplatLabJob;
    setJobId(id); setJob(data); setInput(data.input ?? "");
    if (data.status === "running") poll(id);
  }, [poll, stopPoll]);

  const start = useCallback(async () => {
    setError(null);
    if (!input.trim()) { setError("Paste a Windows path to a video or image folder, or Browse…"); return; }
    setStarting(true);
    try {
      const res = await fetch("/api/splat-lab/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(knobsToRunOptions(knobs, input.trim(), clone, workspaceName)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "request failed" }));
        setError(err.error ?? "request failed"); return;
      }
      const { id } = (await res.json()) as { id: string };
      setJobId(id); setJob(null); poll(id);
    } finally { setStarting(false); }
  }, [input, knobs, clone, workspaceName, poll]);

  const cancel = useCallback(async () => {
    if (!jobId) return;
    await fetch(`/api/splat-lab/jobs/${jobId}`, { method: "POST" });
    stopPoll();
  }, [jobId, stopPoll]);

  const rerun = useCallback(async (fromStage: string) => {
    if (!jobId) return;
    await fetch(`/api/splat-lab/jobs/${jobId}/rerun`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromStage }),
    });
    poll(jobId);
  }, [jobId, poll]);

  const running = job?.status === "running";
  const stages = job?.stages ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <TitleBar label={meta.label} tag={meta.tag} onOpenSettings={() => setShowSettings(true)} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <WorkspaceCard name={workspaceName} onChangeName={setWorkspaceName} />
          <InputCard
            input={input} onChangeInput={setInput}
            knobs={knobs} setKnobs={setKnobs}
            running={running} starting={starting}
            onRun={start} onCancel={cancel} error={error}
          />
          <button onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)] hover:text-white">
            <HelpCircle className="size-3.5" /> Capture guide
          </button>
        </div>
        <JobHistoryRail activeId={jobId} onSelect={selectJob} />
      </div>

      {jobId ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <PrepareImagesCard
              framesStage={stages.find((s) => s.name === "frames")}
              maskStage={stages.find((s) => s.name === "mask")}
              quality={job?.quality}
              onRerun={() => rerun("frames")}
            />
            <ReconstructionCard job={job} onViewSfm={() => setShowSfm(true)} onRerun={() => rerun("sfm")} />
            <SplatGenerationCard
              job={job} jobId={jobId} knobs={knobs} setKnobs={setKnobs}
              isLab={clone === "lab"} onRerun={() => rerun("train")}
              onOpenLiveView={() => setShowLiveView((v) => !v)} showLiveView={showLiveView}
            />
          </div>
          <ViewPublishCard
            job={job} jobId={jobId} showSfm={showSfm} onCloseSfm={() => setShowSfm(false)}
            showLiveView={showLiveView}
          />
        </div>
      ) : null}

      {showSettings ? <SettingsModal onClose={() => setShowSettings(false)} /> : null}
      {showHelp ? <HelpSheet onClose={() => setShowHelp(false)} /> : null}
    </div>
  );
}
