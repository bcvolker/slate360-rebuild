"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { quickCreateProject, StartWalkError } from "@/lib/site-walk/start-walk";

/** Real create action — same quickCreateProject helper Home's Start-a-walk uses. */
export function SW360NewProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const project = await quickCreateProject(name);
      router.push(`/sw360/projects/${project.id}`);
      router.refresh();
    } catch (e2) {
      setError(e2 instanceof StartWalkError ? e2.message : "Something went wrong. Try again.");
      setBusy(false);
    }
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

  return (
    <form onSubmit={handleCreate} className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        className="min-h-[40px] w-40 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
      />
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="flex h-9 items-center rounded-lg bg-[var(--sw360-green-light)] px-3 text-xs font-bold text-white disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : "Create"}
      </button>
      {error ? <span className="text-xs font-semibold text-[var(--sw360-destructive)]">{error}</span> : null}
    </form>
  );
}
