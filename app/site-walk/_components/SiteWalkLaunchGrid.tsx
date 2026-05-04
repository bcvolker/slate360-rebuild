"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, FileText, FolderOpen, HardHat, Loader2, MapPinned, Upload } from "lucide-react";
import { saveQuickCaptureLaunch } from "@/lib/site-walk/quick-capture-launch";

type ProjectOption = { id: string; name: string };
type Props = { projects: ProjectOption[] };
type SessionResponse = { session?: { id: string }; error?: string };

function createClientSessionId() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  return `site-walk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isMobileCaptureDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export function SiteWalkLaunchGrid({ projects }: Props) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileCapture, setMobileCapture] = useState(false);
  const selectedProject = useMemo(() => projects[0] ?? null, [projects]);

  useEffect(() => setMobileCapture(isMobileCaptureDevice()), []);

  function openQuickCapture() {
    setError(null);
    if (mobileCapture) cameraInputRef.current?.click();
    else uploadInputRef.current?.click();
  }

  async function handleQuickFile(file: File | undefined) {
    if (!file) return;
    setCreating("quick");
    setError(null);
    try {
      const launchId = await saveQuickCaptureLaunch(file);
      const sessionId = await createSession(selectedProject, "quick_capture");
      router.push(`/site-walk/capture?session=${encodeURIComponent(sessionId)}&plan=skip&launch=${encodeURIComponent(launchId)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not start quick capture");
      setCreating(null);
    }
  }

  async function startProjectWalk(project: ProjectOption) {
    setCreating(`project:${project.id}`);
    setError(null);
    try {
      const sessionId = await createSession(project, "project_continue");
      router.push(`/site-walk/capture?session=${encodeURIComponent(sessionId)}&quick=camera`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not start project walk");
      setCreating(null);
    }
  }

  return (
    <section className="w-full space-y-3 rounded-[2rem] border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-md sm:p-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <h1 className="text-2xl font-black text-white">Site Walk</h1>
        <Link href="/projects" className="text-xs font-black text-slate-400 hover:text-amber-300 transition-colors">Projects</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Primary — planning-first */}
        <Link
          href="/site-walk/setup"
          className="group min-h-32 rounded-3xl bg-amber-500 p-4 text-left text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.30)] transition hover:bg-amber-400"
        >
          <span className="flex items-center justify-between gap-3">
            <HardHat className="h-7 w-7" />
            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
          </span>
          <span className="mt-5 block text-xl font-black">Plan &amp; Start Walk</span>
        </Link>

        {/* Secondary — quick capture for emergencies */}
        <button
          type="button"
          onClick={openQuickCapture}
          disabled={!!creating}
          className="group min-h-32 rounded-3xl border border-white/15 bg-slate-900/70 p-4 text-left text-slate-50 shadow-lg backdrop-blur-md transition hover:border-amber-400/60 hover:bg-amber-500/10 disabled:opacity-60"
        >
          <span className="flex items-center justify-between gap-3">
            {creating === "quick" ? <Loader2 className="h-7 w-7 animate-spin" /> : mobileCapture ? <Camera className="h-7 w-7 text-amber-300" /> : <Upload className="h-7 w-7 text-amber-300" />}
          </span>
          <span className="mt-5 block text-xl font-black">Quick Capture</span>
          <span className="mt-1 block text-xs text-slate-400">No plan needed</span>
        </button>
      </div>

      {(projects.length > 0) && (
        <aside className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-white">Continue a Project</p>
            <Link href="/projects" className="text-xs font-black text-slate-400 hover:text-amber-300 transition-colors">All projects</Link>
          </div>
          <div className="mt-3 space-y-2">
            {projects.slice(0, 4).map((project) => (
              <button key={project.id} type="button" onClick={() => void startProjectWalk(project)} disabled={!!creating} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-amber-400/60 hover:bg-amber-500/10 disabled:opacity-60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950"><MapPinned className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-white">{project.name}</span>
                  <span className="text-xs font-bold text-slate-400">{creating === `project:${project.id}` ? "Starting walk…" : "Start or continue a walk"}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/site-walk/walks" className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-amber-400/60 hover:bg-amber-500/10">
          <Camera className="h-5 w-5 text-amber-400" />
          <h2 className="mt-3 text-sm font-black text-white">Walks</h2>
        </Link>
        <Link href="/site-walk/slatedrop" className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-amber-400/60 hover:bg-amber-500/10">
          <FolderOpen className="h-5 w-5 text-amber-400" />
          <h2 className="mt-3 text-sm font-black text-white">Files</h2>
        </Link>
        <Link href="/site-walk/deliverables" className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-amber-400/60 hover:bg-amber-500/10">
          <FileText className="h-5 w-5 text-amber-400" />
          <h2 className="mt-3 text-sm font-black text-white">Outputs</h2>
        </Link>
      </div>

      {error && <p className="mt-3 rounded-2xl bg-rose-950/60 border border-rose-500/30 px-4 py-3 text-sm font-bold text-rose-300">{error}</p>}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { void handleQuickFile(event.target.files?.[0]); event.target.value = ""; }} />
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { void handleQuickFile(event.target.files?.[0]); event.target.value = ""; }} />
    </section>
  );
}

async function createSession(project: ProjectOption | null, source: string) {
  const response = await fetch("/api/site-walk/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: project?.id ?? null,
      is_ad_hoc: !project,
      client_session_id: createClientSessionId(),
      title: project ? `${project.name} — Field Walk` : "Quick Capture Walk",
      metadata: { source: "site_walk_launch_grid", start_mode: project ? "project" : "ad_hoc", route: source },
      session_type: "general",
      sync_state: "synced",
    }),
  });
  const data = (await response.json().catch(() => null)) as SessionResponse | null;
  if (!response.ok || !data?.session?.id) throw new Error(data?.error ?? "Could not start walk");
  return data.session.id;
}
