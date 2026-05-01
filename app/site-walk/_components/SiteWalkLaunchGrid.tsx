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
    <section className="w-full space-y-4 rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-md sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-4 shadow-lg sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">Site Walk Cockpit</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl">
            Start field work, then turn the walk into something useful.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-300">
            Choose a field project, capture stops, add context, collect files, and finish with a walk summary or deliverable handoff.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={openQuickCapture} disabled={!!creating} className="group min-h-36 rounded-3xl bg-blue-600 p-4 text-left text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition hover:bg-blue-500 disabled:opacity-60">
              <span className="flex items-center justify-between gap-3">
                {creating === "quick" ? <Loader2 className="h-7 w-7 animate-spin" /> : mobileCapture ? <Camera className="h-7 w-7" /> : <Upload className="h-7 w-7" />}
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </span>
              <span className="mt-5 block text-xl font-black">Start Walk Now</span>
              <span className="mt-1 block text-sm font-bold text-blue-50">{mobileCapture ? "Open the camera for Stop 1" : "Upload the first photo for Stop 1"}</span>
            </button>

            <Link href="/site-walk/setup" className="min-h-36 rounded-3xl border border-white/15 bg-white/5 p-4 text-left shadow-lg backdrop-blur-md transition hover:border-blue-400/60 hover:bg-blue-500/10">
              <HardHat className="h-7 w-7 text-blue-300" />
              <span className="mt-5 block text-xl font-black text-slate-50">Set Up a Field Project</span>
              <span className="mt-1 block text-sm font-bold text-slate-400">Plans, locations, stakeholders, and capture defaults.</span>
            </Link>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Continue</p>
            <Link href="/projects" className="text-xs font-black text-blue-200 hover:text-blue-100">All projects</Link>
          </div>
          <div className="mt-3 space-y-2">
            {projects.slice(0, 4).map((project) => (
              <button key={project.id} type="button" onClick={() => void startProjectWalk(project)} disabled={!!creating} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-blue-400/60 hover:bg-blue-500/10 disabled:opacity-60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white"><MapPinned className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-white">{project.name}</span>
                  <span className="text-xs font-bold text-slate-400">{creating === `project:${project.id}` ? "Starting walk…" : "Start or continue a walk"}</span>
                </span>
              </button>
            ))}
            {projects.length === 0 && (
              <Link href="/site-walk/setup" className="block rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm font-bold leading-6 text-slate-300">
                Create your first Field Project before a planned walk, or use Start Walk Now for ad hoc capture.
              </Link>
            )}
          </div>
        </aside>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/site-walk/walks" className="rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-blue-400/60 hover:bg-blue-500/10">
          <Camera className="h-5 w-5 text-blue-300" />
          <h2 className="mt-3 text-sm font-black text-white">Walks</h2>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-400">Resume sessions and review completed walk summaries.</p>
        </Link>
        <Link href="/site-walk/slatedrop" className="rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-blue-400/60 hover:bg-blue-500/10">
          <FolderOpen className="h-5 w-5 text-blue-300" />
          <h2 className="mt-3 text-sm font-black text-white">Files</h2>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-400">Plans, photos, markups, voice notes, and shared files.</p>
        </Link>
        <Link href="/site-walk/deliverables" className="rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-blue-400/60 hover:bg-blue-500/10">
          <FileText className="h-5 w-5 text-blue-300" />
          <h2 className="mt-3 text-sm font-black text-white">Outputs</h2>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-400">Turn captured stops into shareable deliverables.</p>
        </Link>
      </div>

      {error && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

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
