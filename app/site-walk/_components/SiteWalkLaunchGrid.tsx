"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronDown, FileImage, FolderKanban, HardHat, Loader2, Map, Upload } from "lucide-react";
import { saveQuickCaptureLaunch } from "@/lib/site-walk/quick-capture-launch";

type ProjectOption = { id: string; name: string };
type Props = { projects: ProjectOption[]; appStoreMode: boolean };
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

export function SiteWalkLaunchGrid({ projects, appStoreMode }: Props) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [creating, setCreating] = useState<"quick" | "plan" | "photos" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileCapture, setMobileCapture] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId) ?? null, [projectId, projects]);

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

  async function startWalk(routeMode: "plan" | "photos") {
    setCreating(routeMode);
    setError(null);
    try {
      const sessionId = await createSession(selectedProject, routeMode);
      router.push(routeMode === "plan" ? `/site-walk/plans?session=${encodeURIComponent(sessionId)}` : `/site-walk/capture?session=${encodeURIComponent(sessionId)}&plan=skip`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not start walk");
      setCreating(null);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-600">
            Field Project
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-1 min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-base font-bold normal-case tracking-normal text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15">
              {projects.length === 0 && <option value="">No field projects yet — quick capture starts ad-hoc</option>}
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setToolsOpen((open) => !open)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-900 transition hover:border-blue-300 hover:text-blue-800">
            <HardHat className="h-4 w-4" /> Project <ChevronDown className="h-4 w-4" />
          </button>
          {toolsOpen && <ProjectTools appStoreMode={appStoreMode} onClose={() => setToolsOpen(false)} />}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" onClick={openQuickCapture} disabled={!!creating} className="min-h-24 rounded-3xl bg-blue-600 p-4 text-left text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 sm:min-h-28">
          {creating === "quick" ? <Loader2 className="h-6 w-6 animate-spin" /> : mobileCapture ? <Camera className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
          <span className="mt-2 block text-lg font-black">{mobileCapture ? "Quick Capture" : "Upload"}</span>
          <span className="mt-0.5 block text-xs font-bold text-blue-50">{mobileCapture ? "Camera now" : "Picture folder"}</span>
        </button>

        <button type="button" onClick={() => void startWalk("plan")} disabled={!!creating || !selectedProject} className="min-h-24 rounded-3xl border border-slate-300 bg-white p-4 text-left transition hover:border-blue-300 disabled:opacity-60 sm:min-h-28">
          {creating === "plan" ? <Loader2 className="h-6 w-6 animate-spin text-blue-800" /> : <Map className="h-6 w-6 text-blue-800" />}
          <span className="mt-2 block text-lg font-black text-slate-950">Plans</span>
          <span className="mt-0.5 block text-xs font-bold text-slate-600">Walk with sheets</span>
        </button>

        <button type="button" onClick={() => void startWalk("photos")} disabled={!!creating} className="min-h-24 rounded-3xl border border-slate-300 bg-white p-4 text-left transition hover:border-blue-300 disabled:opacity-60 sm:min-h-28">
          {creating === "photos" ? <Loader2 className="h-6 w-6 animate-spin text-blue-800" /> : <FileImage className="h-6 w-6 text-blue-800" />}
          <span className="mt-2 block text-lg font-black text-slate-950">Photos Only</span>
          <span className="mt-0.5 block text-xs font-bold text-slate-600">No plan needed</span>
        </button>

        <Link href="/site-walk/walks" className="min-h-24 rounded-3xl border border-slate-300 bg-white p-4 text-left transition hover:border-blue-300 sm:min-h-28">
          <FolderKanban className="h-6 w-6 text-blue-800" />
          <span className="mt-2 block text-lg font-black text-slate-950">Resume</span>
          <span className="mt-0.5 block text-xs font-bold text-slate-600">Active walks</span>
        </Link>
      </div>

      {error && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { void handleQuickFile(event.target.files?.[0]); event.target.value = ""; }} />
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { void handleQuickFile(event.target.files?.[0]); event.target.value = ""; }} />
    </section>
  );
}

function ProjectTools({ appStoreMode, onClose }: { appStoreMode: boolean; onClose: () => void }) {
  const links = [
    { href: "/site-walk/setup", label: "Setup & Branding" },
    { href: "/site-walk/plans", label: "Plan Room", hidden: appStoreMode },
    { href: "/site-walk/deliverables", label: "Deliverables", hidden: appStoreMode },
  ];
  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xl">
      {links.filter((link) => !link.hidden).map((link) => <Link key={link.href} href={link.href} onClick={onClose} className="block px-4 py-3 text-sm font-black text-slate-900 hover:bg-slate-50">{link.label}</Link>)}
    </div>
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
