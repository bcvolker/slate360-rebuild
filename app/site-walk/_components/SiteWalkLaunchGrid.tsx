"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, FolderOpen, HardHat, Loader2, Upload } from "lucide-react";
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
  const [creating, setCreating] = useState<"quick" | null>(null);
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

  return (
    <section className="w-full rounded-3xl border border-slate-300 bg-white p-3 shadow-sm sm:p-4">
      <div className="grid h-full grid-cols-3 gap-2 sm:gap-3">
        <button type="button" onClick={openQuickCapture} disabled={!!creating} className="min-h-28 rounded-3xl bg-blue-600 p-3 text-left text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 sm:min-h-36 sm:p-5">
          {creating === "quick" ? <Loader2 className="h-7 w-7 animate-spin" /> : mobileCapture ? <Camera className="h-7 w-7" /> : <Upload className="h-7 w-7" />}
          <span className="mt-3 block text-base font-black sm:text-xl">{mobileCapture ? "Quick Capture" : "Upload"}</span>
          <span className="mt-1 block text-xs font-bold text-blue-50 sm:text-sm">{mobileCapture ? "Camera" : "Pictures"}</span>
        </button>

        <Link href="/site-walk/setup" className="min-h-28 rounded-3xl border border-slate-300 bg-white p-3 text-left transition hover:border-blue-300 sm:min-h-36 sm:p-5">
          <HardHat className="h-7 w-7 text-blue-800" />
          <span className="mt-3 block text-base font-black text-slate-950 sm:text-xl">Project</span>
          <span className="mt-1 block text-xs font-bold text-slate-600 sm:text-sm">Create / manage</span>
        </Link>

        <Link href="/site-walk/slatedrop" className="min-h-28 rounded-3xl border border-slate-300 bg-white p-3 text-left transition hover:border-blue-300 sm:min-h-36 sm:p-5">
          <FolderOpen className="h-7 w-7 text-blue-800" />
          <span className="mt-3 block text-base font-black text-slate-950 sm:text-xl">SlateDrop</span>
          <span className="mt-1 block text-xs font-bold text-slate-600 sm:text-sm">Site Walk files</span>
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
