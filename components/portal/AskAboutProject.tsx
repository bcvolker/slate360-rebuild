"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";

/** "Ask a question" form for the client portal — see PortalClient.tsx. */
export function AskAboutProject({ token, onCreated }: { token: string; projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/portal/${token}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), type: "question" }),
      });
      if (res.ok) {
        setTitle("");
        setOpen(false);
        onCreated();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold"
      >
        <MessageSquarePlus className="h-4 w-4" /> Ask a question
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl p-4" style={{ background: "var(--portal-surface)" }}>
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What would you like to ask?"
        rows={2}
        className="w-full resize-none rounded-lg border border-white/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-white/40"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !title.trim()}
          className="min-h-11 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--portal-accent)" }}
        >
          {busy ? "Sending…" : "Send"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg border border-white/15 px-4 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
