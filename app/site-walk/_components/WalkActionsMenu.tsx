"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, FileText, Link2, MoreVertical, Pencil, Play, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModalActions } from "./ModalActions";
import type { HubProject, HubWalk } from "./siteWalkHubTypes";

type ModalState = "none" | "rename" | "project" | "archive" | "delete";
type BusyAction = "rename" | "project" | "archive" | "delete" | null;

export function WalkActionsMenu({ walk, projects }: { walk: HubWalk; projects: HubProject[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>("none");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(walk.title);
  const [projectId, setProjectId] = useState(walk.projectId ?? "");

  async function patchSession(action: BusyAction, payload: Record<string, unknown>) {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/site-walk/sessions/${encodeURIComponent(walk.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? `Server error ${response.status}`);
      setModal("none");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update walk.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteSession(permanent: boolean) {
    setBusy(permanent ? "delete" : "archive");
    setError(null);
    try {
      const response = await fetch(`/api/site-walk/sessions/${encodeURIComponent(walk.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          permanent
            ? { permanent: true, confirmText: "DELETE", confirmName: walk.title.trim() }
            : {},
        ),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? `Server error ${response.status}`);
      setModal("none");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update walk.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Open actions for ${walk.title}`}
            className="flex h-11 shrink-0 items-center justify-center gap-1 rounded-2xl border border-amber-400/25 bg-white/[0.06] px-2 text-amber-200 transition hover:border-amber-400/70 hover:bg-white/[0.1]"
          >
            <MoreVertical className="h-5 w-5" />
            <span className="sr-only">More</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#0B0F15]/95 text-slate-100 backdrop-blur-xl">
          <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs hover:bg-amber-500/10 hover:text-amber-200">
            <Link href={walkHref(walk)}>
              <Play className="h-4 w-4" /> Resume / Open
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={() => setModal("rename")} className="cursor-pointer gap-2 text-xs hover:bg-amber-500/10 hover:text-amber-200">
            <Pencil className="h-4 w-4" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setModal("project")} className="cursor-pointer gap-2 text-xs hover:bg-amber-500/10 hover:text-amber-200">
            <Link2 className="h-4 w-4" /> Link / Change Project
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs hover:bg-amber-500/10 hover:text-amber-200">
            <Link href={`/site-walk/deliverables/new?session=${encodeURIComponent(walk.id)}`}>
              <FileText className="h-4 w-4" /> Create Deliverable
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={() => setModal("archive")} className="cursor-pointer gap-2 text-xs hover:bg-amber-500/10 hover:text-amber-200">
            <Archive className="h-4 w-4" /> Archive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setModal("delete")} className="cursor-pointer gap-2 text-xs text-rose-200 hover:bg-rose-500/10 hover:text-rose-100">
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {modal !== "none" && (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#111827] p-5 text-slate-50 shadow-2xl">
            {modal === "rename" && (
              <div className="space-y-4">
                <div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Rename walk</p><h2 className="mt-1 text-lg font-black">Update walk title</h2></div>
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white outline-none focus:border-amber-400" />
                <ModalActions onCancel={() => setModal("none")} busy={busy === "rename"} onConfirm={() => void patchSession("rename", { title })} confirmLabel="Save title" />
              </div>
            )}

            {modal === "project" && (
              <div className="space-y-4">
                <div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Project link</p><h2 className="mt-1 text-lg font-black">Link this walk</h2></div>
                <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white outline-none focus:border-amber-400">
                  <option value="">No project / Quick Walk</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
                <ModalActions onCancel={() => setModal("none")} busy={busy === "project"} onConfirm={() => void patchSession("project", { project_id: projectId || null })} confirmLabel="Save project" />
              </div>
            )}

            {modal === "archive" && (
              <div className="space-y-4">
                <div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Archive walk</p><h2 className="mt-1 text-lg font-black">Archive {walk.title}?</h2><p className="mt-2 text-sm text-slate-400">Archived walks are hidden from the home command center but are not hard-deleted.</p></div>
                <ModalActions onCancel={() => setModal("none")} busy={busy === "archive"} onConfirm={() => void deleteSession(false)} confirmLabel="Archive walk" />
              </div>
            )}

            {modal === "delete" && (
              <div className="space-y-4">
                <div><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">Delete walk</p><h2 className="mt-1 text-lg font-black">Delete this walk?</h2><p className="mt-2 text-sm text-slate-400">This cannot be undone.</p></div>
                <ModalActions onCancel={() => setModal("none")} busy={busy === "delete"} onConfirm={() => void deleteSession(true)} confirmLabel="Delete Walk" danger />
              </div>
            )}
            {error && <p className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-200">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}

function walkHref(walk: HubWalk) {
  return walk.status === "completed" ? `/site-walk/walks/${encodeURIComponent(walk.id)}` : `/site-walk/capture?session=${encodeURIComponent(walk.id)}`;
}
