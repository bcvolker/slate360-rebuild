"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountDeletionPanel() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirmation !== "DELETE MY ACCOUNT") return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      if (res.ok) {
        window.location.href = "/login?deleted=true";
        return;
      }
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to delete account. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section
      id="delete-account"
      className="rounded-3xl border border-rose-500/20 bg-rose-950/20 p-5 shadow-lg backdrop-blur-md"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-300">Danger zone</p>
      <h2 className="mt-1 text-lg font-black text-white">Delete account</h2>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
        Permanently delete your Slate360 account and revoke access to all workspace data.
      </p>

      {!showConfirm ? (
        <Button
          type="button"
          className="mt-4 rounded-2xl bg-rose-500/10 px-5 font-black text-rose-300 hover:bg-rose-500 hover:text-white"
          onClick={() => setShowConfirm(true)}
        >
          Delete account
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-bold text-slate-300">
            Type <code className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs font-black text-rose-200">DELETE MY ACCOUNT</code> to confirm.
          </p>
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="DELETE MY ACCOUNT"
            className="max-w-xs border-rose-500/30 bg-slate-950 font-mono text-sm text-slate-100 focus-visible:ring-rose-500/50"
          />
          {error ? <p className="text-sm font-bold text-rose-300">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-2xl bg-rose-600 font-black text-white hover:bg-rose-500"
              onClick={handleDelete}
              disabled={deleting || confirmation !== "DELETE MY ACCOUNT"}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Permanently delete"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-2xl font-bold text-slate-400 hover:text-white"
              onClick={() => {
                setShowConfirm(false);
                setConfirmation("");
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
