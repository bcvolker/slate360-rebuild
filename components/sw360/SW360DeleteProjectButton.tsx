"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

/**
 * Real project management, not just viewing — Brian: "the user needs the
 * ability to actually manage the projects that are created." Wires the
 * existing (already-built, safety-gated) DELETE /api/projects/[projectId]
 * route: type-the-word-DELETE + type-the-exact-project-name double
 * confirmation, same contract the legacy app's delete flow already uses —
 * not a new, less-careful deletion mechanism.
 */
export function SW360DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText, confirmName }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not delete the project.");
      }
      router.push("/sw360/projects");
      router.refresh();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Could not delete the project.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[40px] w-fit items-center gap-1.5 text-xs font-bold text-[var(--sw360-destructive)]"
      >
        <Trash2 size={14} /> Delete project
      </button>
    );
  }

  return (
    <form
      onSubmit={handleDelete}
      className="rounded-2xl border border-[var(--sw360-destructive)]/40 bg-white/70 p-4"
    >
      <p className="text-sm font-bold text-[var(--sw360-charcoal)]">Delete this project?</p>
      <p className="mt-1 text-xs text-[var(--sw360-charcoal)]/60">
        This removes all its walks, plans, and files. This can&apos;t be undone.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={`Type "${projectName}" to confirm`}
          className="min-h-[40px] rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-destructive)]"
        />
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder='Type "DELETE" to confirm'
          className="min-h-[40px] rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-destructive)]"
        />
      </div>
      {error ? <p className="mt-2 text-xs font-semibold text-[var(--sw360-destructive)]">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy || confirmText !== "DELETE" || confirmName !== projectName}
          className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[var(--sw360-destructive)] px-4 text-xs font-bold text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          Delete
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex min-h-[40px] items-center rounded-lg border border-[var(--border)] px-4 text-xs font-bold text-[var(--sw360-charcoal)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
