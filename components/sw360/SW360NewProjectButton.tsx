"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { quickCreateProject, StartWalkError, type QuickCreateLocation } from "@/lib/site-walk/start-walk";

const ProjectLocationPicker = dynamic(() => import("@/components/projects/mobile/ProjectLocationPicker"), {
  ssr: false,
});

type ProjectLatLng = { lat: number; lng: number };
type ProjectLocationValue = { address: string; lat: number | null; lng: number | null; boundary: ProjectLatLng[] };
const EMPTY_LOCATION: ProjectLocationValue = { address: "", lat: null, lng: null, boundary: [] };

/**
 * Two-step create: name → location (rev 6/7 lock — "name + address only,
 * then a setup checklist"). Location is skippable; Create fires immediately
 * from either step. Same quickCreateProject helper Home's Start-a-walk uses.
 */
export function SW360NewProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"name" | "location">("name");
  const [name, setName] = useState("");
  const [location, setLocation] = useState(EMPTY_LOCATION);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finishCreate(loc: QuickCreateLocation | null) {
    setBusy(true);
    setError(null);
    try {
      const project = await quickCreateProject(name, loc);
      router.push(`/sw360/projects/${project.id}`);
      router.refresh();
    } catch (e2) {
      setError(e2 instanceof StartWalkError ? e2.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setStep("location");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="New project"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sw360-green-light)] text-white"
      >
        <Plus size={18} />
      </button>
    );
  }

  if (step === "location") {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-white/70 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
          Where is {name}?
        </p>
        <div className="h-56 overflow-hidden rounded-xl border border-[var(--border)]">
          <ProjectLocationPicker value={location} onChange={setLocation} />
        </div>
        {error ? <p className="text-xs font-semibold text-[var(--sw360-destructive)]">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void finishCreate(null)}
            className="flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-[var(--border)] text-xs font-bold text-[var(--sw360-charcoal)] disabled:opacity-60"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void finishCreate(location.address ? location : null)}
            className="flex min-h-[40px] flex-1 items-center justify-center rounded-lg bg-[var(--sw360-green-light)] text-xs font-bold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : "Create project"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleNameSubmit} className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        className="min-h-[40px] w-40 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="flex h-9 items-center rounded-lg bg-[var(--sw360-green-light)] px-3 text-xs font-bold text-white disabled:opacity-60"
      >
        Next
      </button>
    </form>
  );
}
