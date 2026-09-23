"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "approve" | "reject" | "publish" | "revoke";
type Bucket = "needs_review" | "ready_to_publish" | "published" | "rejected";

export function VnextReleaseActions({
  projectId,
  projectName,
  representation,
  representationLabel,
  sourceId,
  version,
  bucket,
}: {
  projectId: string;
  projectName: string;
  representation: string;
  representationLabel: string;
  sourceId: string;
  version: string | null;
  bucket: Bucket;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [needsRecapture, setNeedsRecapture] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(action: Action) {
    if ((action === "publish" || action === "revoke") && pending !== action) {
      setPending(action);
      return;
    }
    setError(null);
    const response = await fetch(`/api/vnext/ops/projects/${projectId}/release`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, representation, sourceId, note, needsRecapture }),
    });
    if (!response.ok) {
      setError("That action could not be saved.");
      return;
    }
    setPending(null);
    router.refresh();
  }

  const prompt = pending === "publish"
    ? `Publish this ${representationLabel} to the client?`
    : pending === "revoke"
      ? `Remove this ${representationLabel} from the client?`
      : null;

  const reviewing = bucket === "needs_review" || bucket === "rejected" || bucket === "ready_to_publish";
  const buttonClass = "inline-flex h-11 min-w-11 items-center justify-center border border-[var(--vnext-line)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]";
  return (
    <div className="mt-4" data-vnext-release-actions="true">
      {reviewing ? (
        <>
          <label className="block text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]" htmlFor="review-note">Review note</label>
          <textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} className="mt-1 w-full border border-[var(--vnext-line)] bg-white p-2 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" />
          <label className="mt-2 flex min-h-11 items-center gap-2 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
            <input type="checkbox" checked={needsRecapture} onChange={(event) => setNeedsRecapture(event.target.checked)} />
            Needs another capture
          </label>
        </>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {bucket === "needs_review" || bucket === "rejected" ? <button type="button" className={buttonClass} onClick={() => send("approve")}>Approve</button> : null}
        {bucket === "needs_review" || bucket === "ready_to_publish" ? <button type="button" className={buttonClass} onClick={() => send("reject")}>Reject</button> : null}
        {bucket === "ready_to_publish" ? <button type="button" className={buttonClass} onClick={() => send("publish")}>Publish</button> : null}
        {bucket === "published" ? <button type="button" className={buttonClass} onClick={() => send("revoke")}>Unpublish</button> : null}
      </div>
      {prompt ? (
        <div className="mt-3 border border-[var(--vnext-line)] bg-white p-3" data-vnext-publish-confirm="true">
          <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{prompt}</p>
          <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">{projectName} · {representationLabel} · {version ?? "Undated"}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="inline-flex h-11 items-center bg-[var(--vnext-ink)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-surface)]" onClick={() => send(pending!)}>Confirm</button>
            <button type="button" className="inline-flex h-11 items-center border border-[var(--vnext-line)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{error}</p> : null}
    </div>
  );
}
