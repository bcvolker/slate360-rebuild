"use client";

import { useState } from "react";
import { Loader2, SendHorizonal } from "lucide-react";

/** Right-rail prompt composer. Sends the prompt to the AI layer and reports
 *  the new variant back so the workspace can track it via realtime. */
export function PromptComposer({
  sessionId,
  parentVariantId,
  onSubmitted,
}: {
  sessionId: string | null;
  parentVariantId: string | null;
  onSubmitted: (variantId: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !sessionId || busy || !text.trim();

  async function submit() {
    if (!sessionId || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/design-studio/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, parentVariantId, promptText: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Generation failed");
      setText("");
      if (data.variant?.id) onSubmitted(data.variant.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!sessionId || busy}
        placeholder={
          sessionId
            ? "Describe a change — e.g. “remove the furniture, oak floors, add a modern sofa”."
            : "Import a twin to start."
        }
        className="h-32 w-full resize-none rounded-md border border-white/10 bg-white/5 p-2 text-xs text-slate-300 placeholder:text-slate-600 focus:border-white/20 focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
      />
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <button
        onClick={submit}
        disabled={disabled}
        className="flex items-center justify-center gap-1.5 rounded-md bg-[#3D8EFF] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#3580E6] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizonal className="size-3.5" />}
        {busy ? "Generating…" : "Generate"}
      </button>
      <p className="text-[10px] text-slate-600">⌘/Ctrl + Enter to send</p>
    </div>
  );
}
