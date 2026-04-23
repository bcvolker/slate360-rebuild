"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import { LiveWalkShell } from "@/components/site-walk/LiveWalkShell";
import NoteCaptureBar from "@/components/site-walk/NoteCaptureBar";

interface Props {
  sessionId: string;
  itemId: string;
  title: string;
  description: string;
  hasPhoto: boolean;
  thumbnailUrl: string | null;
  prevItemId: string | null;
  nextItemId: string | null;
  position: number;
  total: number;
}

type Toast = { kind: "success" | "error"; text: string };

export default function AnnotateClient({
  sessionId,
  itemId,
  title,
  description,
  hasPhoto,
  thumbnailUrl,
  prevItemId,
  nextItemId,
  position,
  total,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const captureUrl = `/site-walk/walks/active/${sessionId}`;
  const prevUrl = prevItemId ? `/site-walk/walks/active/${sessionId}/items/${prevItemId}/annotate` : null;
  const nextUrl = nextItemId ? `/site-walk/walks/active/${sessionId}/items/${nextItemId}/annotate` : null;

  async function save(text: string) {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch(`/api/site-walk/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: text,
          title: title || text.slice(0, 80),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setToast({ kind: "error", text: j.error ?? "Save failed" });
        return;
      }
      setToast({ kind: "success", text: "Saved" });
      // Auto-advance: if there's a next item, go there. Else back to capture.
      router.push(nextUrl ?? captureUrl);
    } finally {
      setSaving(false);
    }
  }

  return (
    <LiveWalkShell title={`Annotate · ${position}/${total}`}>
      <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 4rem)" }}>
        {/* Thumbnail strip — pinned ABOVE the note input so it stays visible
            when the keyboard appears. */}
        <div className="px-4 pt-3 shrink-0">
          {hasPhoto && thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={title || "capture"}
              className="w-full max-h-48 object-contain rounded-lg border border-white/10 bg-black"
            />
          ) : (
            <div className="w-full p-3 rounded-lg border border-white/10 bg-white/5 text-xs text-slate-400">
              Text note · {title || "untitled"}
            </div>
          )}
        </div>

        {/* Note input */}
        <div className="px-4 py-3 flex-1">
          <NoteCaptureBar
            initialText={description}
            placeholder="What did you see? Speak, type, or both."
            saveLabel={nextItemId ? "Save & Next" : "Save & Done"}
            saving={saving}
            onSave={save}
            onCancel={() => router.push(captureUrl)}
          />
        </div>

        {/* Prev / Next / New capture footer */}
        <div className="border-t border-white/10 bg-bg-base/95 backdrop-blur px-4 py-2 flex items-center justify-between sticky bottom-0">
          {prevUrl ? (
            <Link href={prevUrl} className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Prev
            </Link>
          ) : (
            <span className="text-sm text-slate-600 inline-flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> Prev</span>
          )}

          <Link
            href={captureUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-cobalt/40 bg-cobalt/10 text-cobalt hover:bg-cobalt/20"
          >
            <Camera className="h-4 w-4" /> New capture
          </Link>

          {nextUrl ? (
            <Link href={nextUrl} className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-foreground">
              Next <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="text-sm text-slate-600 inline-flex items-center gap-1">Next <ChevronRight className="h-4 w-4" /></span>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg ${
          toast.kind === "success" ? "bg-emerald-600 text-foreground" : "bg-red-600 text-foreground"
        }`}>
          {toast.kind === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.text}
        </div>
      )}
    </LiveWalkShell>
  );
}
