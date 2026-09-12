"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DoctorReport } from "@/lib/splat-lab/doctor";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [report, setReport] = useState<DoctorReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = (force: boolean) => {
    setLoading(true);
    fetch(`/api/splat-lab/doctor${force ? "?force=1" : ""}`)
      .then((r) => r.json())
      .then(setReport)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(false); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[var(--graphite-canvas)] p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Settings</p>
          <button onClick={onClose} className="text-[var(--graphite-muted)] hover:text-white"><X className="size-4" /></button>
        </div>

        <div className="mt-3 space-y-2 text-xs text-[var(--graphite-text-body)]">
          <Row label="WSL distro" value="Ubuntu-22.04" />
          <Row label="Python venv" value="/home/rian_/slate360-engines/nerfstudio/.venv" />
          <Row label="COLMAP" value="/home/rian_/slate360-engines/colmap-4.1.0/bin" />
          <Row label="Workspace root" value="C:\Users\Brian PC\Slate360Jobs" />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Engine doctor</p>
          <button onClick={() => load(true)} className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--twin360-blue)]">
            {loading ? <Loader2 className="size-3 animate-spin" /> : null} Run doctor
          </button>
        </div>
        <div className="mt-2 space-y-1">
          {report?.checks.map((c) => (
            <div key={c.name} className="flex items-center justify-between rounded-md border border-white/10 px-2.5 py-1.5">
              <span className="inline-flex items-center gap-2 text-xs text-[var(--graphite-text-body)]">
                <span className={cn("size-1.5 rounded-full", c.ok ? "bg-[var(--graphite-primary)]" : "bg-red-500")} />
                {c.name}
              </span>
              <span className="font-mono text-[10px] text-[var(--graphite-muted)]">{c.detail}</span>
            </div>
          )) ?? (
            <p className="p-2 text-center text-xs text-[var(--graphite-muted)]">Checking…</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{label}</span>
      <span className="truncate font-mono text-[11px] text-zinc-400">{value}</span>
    </div>
  );
}
