"use client";

import { CheckCircle2, Clock, Download, Loader2, X, XCircle } from "lucide-react";
import type { RenderJob } from "./render-jobs";

function ago(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

/** Slide-in render queue: status, progress, and download for each export. */
export function RenderQueueDrawer({ jobs, onClose }: { jobs: RenderJob[]; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-80 flex-col border-l border-white/10 bg-[#0B0F15] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Renders</h2>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {jobs.length === 0 ? (
            <p className="px-1 pt-4 text-center text-xs text-white/35">No renders yet. Use Export to create one.</p>
          ) : (
            jobs.map((j) => <JobRow key={j.id} job={j} />)
          )}
        </div>
      </div>
    </div>
  );
}

function JobRow({ job }: { job: RenderJob }) {
  const active = job.status === "queued" || job.status === "processing";
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-white/85">
          <StatusIcon status={job.status} />
          {job.aspect ?? "render"} · {job.status}
        </span>
        <span className="text-[10px] text-white/35">{ago(job.createdAt)}</span>
      </div>
      {active && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#3D8EFF] transition-all" style={{ width: `${job.progressPct}%` }} />
        </div>
      )}
      {job.status === "failed" && job.errorText && (
        <p className="mt-1 text-[10px] text-red-300/80">{job.errorText}</p>
      )}
      {job.status === "completed" && (
        <div className="mt-2">
          {job.stage === "preview-passthrough" && (
            <p className="mb-1 text-[10px] text-[var(--graphite-muted)]">Preview passthrough — full multi-clip render lands with the FFmpeg worker.</p>
          )}
          {job.downloadUrl ? (
            <a
              href={job.downloadUrl}
              download
              className="flex items-center justify-center gap-1.5 rounded-md border border-[#3D8EFF]/40 bg-[#3D8EFF]/15 py-1.5 text-xs text-white hover:bg-[#3D8EFF]/25"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          ) : (
            <p className="text-[10px] text-white/35">Output not available.</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: RenderJob["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (status === "failed" || status === "cancelled") return <XCircle className="h-3.5 w-3.5 text-red-400" />;
  if (status === "processing") return <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3D8EFF]" />;
  return <Clock className="h-3.5 w-3.5 text-white/40" />;
}
