"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { settingsTokens } from "@/components/settings/settings-tokens";

export function AccountDeletionPanel({ isSlateCeo = false }: { isSlateCeo?: boolean }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmation === "DELETE" && acknowledged;

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT" }),
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
    <section id="delete-account" className={settingsTokens.destructiveCard}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-red-400">Danger zone</p>
      <h2 className="mt-1 text-lg font-bold text-[var(--graphite-text-header)]">Delete account</h2>
      <p className="mt-2 text-sm font-medium leading-6 text-[var(--graphite-muted)]">
        This will permanently delete all projects, walks, files, and data tied to this account.
      </p>
      {isSlateCeo ? (
        <p className="mt-2 text-xs font-medium text-[var(--graphite-muted)]">
          Transfer ownership first via the Operations Console before deleting the owner account.
        </p>
      ) : null}

      {!showConfirm ? (
        <button
          type="button"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-red-500/30 px-5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
          onClick={() => setShowConfirm(true)}
        >
          Delete account
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-[var(--graphite-text-body)]">
            Type <span className="font-mono text-red-400">DELETE</span> to confirm.
          </p>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="DELETE"
            className="max-w-xs rounded-xl border border-red-500/30 bg-[var(--surface-zinc)] px-3 py-2 font-mono text-sm text-[var(--graphite-text-body)] outline-none focus:border-red-400"
          />
          <label className="flex items-start gap-2 text-sm font-medium text-[var(--graphite-muted)]">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-red-400"
            />
            I understand data cannot be recovered.
          </label>
          {error ? (
            <p className={settingsTokens.statusError}>
              {error} Contact support@slate360.ai if you need help.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
              onClick={handleDelete}
              disabled={deleting || !canDelete}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Permanently delete"}
            </button>
            <button
              type="button"
              className={settingsTokens.ghostButton}
              onClick={() => {
                setShowConfirm(false);
                setConfirmation("");
                setAcknowledged(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
