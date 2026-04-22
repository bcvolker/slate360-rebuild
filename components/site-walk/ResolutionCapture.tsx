"use client";

import { useRef, useState } from "react";
import { Camera, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { captureMetadata } from "@/lib/site-walk/metadata";

export interface ResolutionCaptureProps {
  /** The "before" item being resolved. */
  beforeItemId: string;
  beforeImageUrl: string;
  sessionId: string;
  /** "resolution" = fixed; "rework" = redone. */
  relationship?: "resolution" | "rework";
  onResolved?: (newItemId: string) => void;
}

/**
 * Side-by-side Before/After capture surface.
 *
 * Real flow (no mocks):
 *   1. User taps "Add 'After' photo" → native camera opens via <input capture>
 *   2. We presign via /api/site-walk/upload (existing endpoint)
 *   3. PUT the binary to S3
 *   4. POST /api/site-walk/items with before_item_id + item_relationship to
 *      create the linked "after" item
 *   5. Optionally PATCH the parent's item_status → "resolved"
 */
export default function ResolutionCapture({
  beforeItemId,
  beforeImageUrl,
  sessionId,
  relationship = "resolution",
  onResolved,
}: ResolutionCaptureProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const meta = await captureMetadata();

      // 1. Presign
      const presignRes = await fetch("/api/site-walk/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          sessionId,
        }),
      });
      const presign = (await presignRes.json()) as {
        uploadUrl?: string; s3Key?: string; fileId?: string; error?: string;
      };
      if (!presignRes.ok || !presign.uploadUrl || !presign.s3Key) {
        setError(presign.error ?? "Upload preflight failed");
        return;
      }

      // 2. PUT binary
      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "image/jpeg" },
      });
      if (!putRes.ok) {
        setError(`S3 upload failed (${putRes.status})`);
        return;
      }

      // 3. Create "after" item linked to before
      const createRes = await fetch("/api/site-walk/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          item_type: "photo",
          title: `After — ${file.name}`,
          s3_key: presign.s3Key,
          file_id: presign.fileId,
          before_item_id: beforeItemId,
          item_relationship: relationship,
          latitude: meta.gps?.latitude ?? null,
          longitude: meta.gps?.longitude ?? null,
          weather: meta.weather ?? null,
          metadata: { ...meta, file_size: file.size, mime_type: file.type, resolves: beforeItemId },
        }),
      });
      const created = (await createRes.json()) as { item?: { id: string }; error?: string };
      if (!createRes.ok || !created.item) {
        setError(created.error ?? "Save failed");
        return;
      }

      // 4. Mark the parent as resolved
      await fetch(`/api/site-walk/items/${beforeItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_status: "resolved" }),
      }).catch(() => {/* non-fatal */});

      setDone(true);
      onResolved?.(created.item.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-100">
          {relationship === "rework" ? "Rework Required" : "Resolution Required"}
        </h4>
        {done && (
          <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Linked
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3">
        {/* BEFORE */}
        <div className="flex-1 rounded-lg overflow-hidden border border-white/10 relative bg-black">
          <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">
            BEFORE
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={beforeImageUrl} alt="Before condition" className="w-full h-32 object-cover" />
        </div>

        <ArrowRight className="w-5 h-5 text-slate-500 shrink-0" />

        {/* AFTER capture */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || done}
          className="flex-1 h-32 rounded-lg border-2 border-dashed border-cobalt/50 bg-cobalt/5 hover:bg-cobalt/10 flex flex-col items-center justify-center text-cobalt transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-6 h-6 animate-spin mb-2" /> : <Camera className="w-6 h-6 mb-2" />}
          <span className="text-xs font-medium">{busy ? "Saving…" : done ? "Done" : "Add 'After' Photo"}</span>
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
