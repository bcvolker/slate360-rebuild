"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckSquare, Loader2, Square, Trash2, Wand2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type BulkWalkRow = {
  id: string;
  title: string;
  projectName: string | null;
  hasPlan: boolean;
};

/**
 * In-app bulk-clear for test walks. Enter manage mode, multi-select, and
 * delete in one shot — or tap "Select test walks" to auto-pick every walk
 * whose project has no uploaded plan (the ones safe to clear). Walks whose
 * project has a plan are flagged so the testable walk-with-plans walk is hard
 * to delete by accident.
 */
export function WalkBulkManager({ walks }: { walks: BulkWalkRow[] }) {
  const router = useRouter();
  const [manage, setManage] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testWalkIds = useMemo(
    () => walks.filter((w) => !w.hasPlan).map((w) => w.id),
    [walks],
  );
  const selectedPlanCount = useMemo(
    () => walks.filter((w) => w.hasPlan && selected.has(w.id)).length,
    [walks, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitManage() {
    setManage(false);
    setSelected(new Set());
    setError(null);
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/site-walk/sessions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), mode: "permanent" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Bulk delete failed");
      }
      setConfirmOpen(false);
      exitManage();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setDeleting(false);
    }
  }

  if (!manage) {
    return (
      <button
        onClick={() => setManage(true)}
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-2xl border border-white/15 bg-white/[0.05] px-3 text-xs font-black text-slate-200 hover:border-white/30 hover:text-white"
      >
        <Trash2 className="h-3.5 w-3.5" /> Clear test walks
      </button>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelected(new Set(testWalkIds))}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-2xl border border-white/15 bg-white/[0.05] px-3 text-xs font-black text-slate-200 hover:border-white/30 hover:text-white"
        >
          <Wand2 className="h-3.5 w-3.5" /> Select test walks ({testWalkIds.length})
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={selected.size === 0}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-2xl bg-red-600 px-3 text-xs font-black text-white hover:bg-red-700 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete {selected.size > 0 ? `(${selected.size})` : ""}
        </button>
        <button
          onClick={exitManage}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-2xl border border-white/15 bg-white/[0.05] px-3 text-xs font-black text-slate-300 hover:text-white"
        >
          <X className="h-3.5 w-3.5" /> Done
        </button>
      </div>

      {/* Selectable list overlay */}
      <div className="mt-3 max-h-[40vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-2 no-scrollbar">
        {walks.length === 0 ? (
          <p className="px-2 py-3 text-xs font-bold text-slate-500">No walks to manage.</p>
        ) : (
          <ul className="space-y-1">
            {walks.map((w) => {
              const isSel = selected.has(w.id);
              return (
                <li key={w.id}>
                  <button
                    onClick={() => toggle(w.id)}
                    className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition ${
                      isSel ? "bg-red-500/10" : "hover:bg-white/5"
                    }`}
                  >
                    {isSel ? (
                      <CheckSquare className="h-4 w-4 shrink-0 text-red-400" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0 text-slate-500" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-slate-100">{w.title}</span>
                      <span className="block truncate text-[10px] font-semibold text-slate-500">
                        {w.projectName ?? "Quick walk — no project"}
                      </span>
                    </span>
                    {w.hasPlan ? (
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                        Has plan
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="border-white/10 bg-[#151A23] text-slate-100 sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-slate-100">Delete {selected.size} walks?</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400">
              These walks and all their captured items will be permanently deleted. This cannot be undone.
              {selectedPlanCount > 0 ? (
                <span className="mt-2 block font-bold text-amber-300">
                  ⚠ {selectedPlanCount} of these belong to a project with an uploaded plan — you may want to keep those for testing.
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-200">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              className="border border-white/10 text-slate-300 hover:bg-white/10 hover:text-slate-100"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
