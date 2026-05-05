"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteWalkButtonProps {
  walkId: string;
  walkTitle: string;
}

export function DeleteWalkButton({ walkId, walkTitle }: DeleteWalkButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/site-walk/sessions/${walkId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permanent: true, confirmText: "DELETE", confirmName: walkTitle }),
      });
      setOpen(false);
      router.refresh();
    } catch {
      // ignore — page will still refresh
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        aria-label="Delete walk"
        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#151A23] border-white/10 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-slate-100">Delete walk?</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400">
              <span className="font-bold text-slate-200">&ldquo;{walkTitle}&rdquo;</span> and all its captured items will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              className="border border-white/10 text-slate-300 hover:bg-white/10 hover:text-slate-100"
              onClick={() => setOpen(false)}
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

