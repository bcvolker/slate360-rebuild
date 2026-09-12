"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Settings } from "lucide-react";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { cn } from "@/lib/utils";
import pkg from "@/package.json";
import type { DoctorReport } from "@/lib/splat-lab/doctor";

export function TitleBar({
  label,
  tag,
  onOpenSettings,
}: {
  label: string;
  tag: string;
  onOpenSettings: () => void;
}) {
  const [doctor, setDoctor] = useState<DoctorReport | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => {
      fetch("/api/splat-lab/doctor")
        .then((r) => r.json())
        .then((d: DoctorReport) => { if (live) setDoctor(d); })
        .catch(() => undefined);
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => { live = false; window.clearInterval(id); };
  }, []);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <Slate360Logo variant="dark" size="default" />
        <div className="h-8 w-px bg-white/10" />
        <div>
          <h1 className="text-base font-bold text-[var(--graphite-text-header)]">{label}</h1>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
            v{pkg.version}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
          {tag}
        </span>
        <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
          RTX 3090 · 24 GB
        </span>
        <DoctorDot report={doctor} />
        <button
          onClick={onOpenSettings}
          className="rounded-md border border-white/10 p-1.5 text-[var(--graphite-muted)] transition hover:text-white"
          title="Settings"
        >
          <Settings className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function DoctorDot({ report }: { report: DoctorReport | null }) {
  const [refreshing, setRefreshing] = useState(false);
  const failing = report ? report.checks.filter((c) => !c.ok) : [];
  const color = !report ? "bg-zinc-600" : report.ok ? "bg-[var(--graphite-primary)]" : "bg-red-500";
  const title = !report
    ? "Checking engine dependencies…"
    : report.ok
      ? "All engine dependencies OK"
      : `Missing: ${failing.map((c) => c.name).join(", ")}`;

  const refresh = async () => {
    setRefreshing(true);
    try { await fetch("/api/splat-lab/doctor?force=1"); } finally { setRefreshing(false); }
  };

  return (
    <button
      onClick={refresh}
      title={title}
      className="flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)] transition hover:text-white"
    >
      <span className={cn("size-2 rounded-full", color)} />
      Engine
      <RefreshCw className={cn("size-3", refreshing && "animate-spin")} />
    </button>
  );
}
