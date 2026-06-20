"use client";

import { useState, useRef } from "react";
import { Loader2, SendHorizonal, ImagePlus, X } from "lucide-react";

interface RefImage {
  key: string;
  name: string;
}

/** Right-rail prompt composer with drag-drop reference images. Sends the prompt
 *  + reference image keys to the AI layer and reports the new variant. */
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
  const [refs, setRefs] = useState<RefImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const disabled = !sessionId || busy || (!text.trim() && refs.length === 0);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of list) {
        const sign = await fetch("/api/design-studio/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });
        const data = await sign.json();
        if (!sign.ok) throw new Error(data?.error ?? "Upload sign failed");
        await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        setRefs((prev) => [...prev, { key: data.key, name: file.name }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!sessionId || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/design-studio/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          parentVariantId,
          promptText: text.trim(),
          referenceImageKeys: refs.map((r) => r.key),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Generation failed");
      setText("");
      setRefs([]);
      if (data.variant?.id) onSubmitted(data.variant.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-2"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!sessionId || busy}
        placeholder={
          sessionId
            ? "Describe a change — e.g. “remove the furniture, oak floors, add a modern sofa”. Drop images for style/inspiration."
            : "Import a twin to start."
        }
        className="h-28 w-full resize-none rounded-md border border-white/10 bg-white/5 p-2 text-xs text-slate-300 placeholder:text-slate-600 focus:border-white/20 focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
        }}
      />

      {/* Reference images */}
      {refs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {refs.map((r, i) => (
            <span
              key={r.key}
              className="flex max-w-[120px] items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300"
            >
              <span className="truncate">{r.name}</span>
              <button onClick={() => setRefs((prev) => prev.filter((_, j) => j !== i))} className="text-slate-500 hover:text-slate-200">
                <X className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        <button
          onClick={() => fileInput.current?.click()}
          disabled={!sessionId || uploading}
          className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-2 text-[11px] text-slate-300 hover:bg-white/5 disabled:opacity-50"
          title="Add reference images"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
        </button>
        <button
          onClick={submit}
          disabled={disabled}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#3D8EFF] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#3580E6] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizonal className="size-3.5" />}
          {busy ? "Generating…" : "Generate"}
        </button>
      </div>

      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <p className="text-[10px] text-slate-600">⌘/Ctrl + Enter to send · drop images to add inspiration</p>
    </div>
  );
}
