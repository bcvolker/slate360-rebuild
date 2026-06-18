"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type QueueItem = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  message?: string;
};

export function ThermalUploadClient() {
  const router = useRouter();
  const [sessionName, setSessionName] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readyCount = useMemo(() => queue.filter((q) => q.status === "done").length, [queue]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const next = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      status: "queued" as const,
    }));
    setQueue((prev) => [...prev, ...next]);
  }, []);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const name = sessionName.trim() || `Thermal session ${new Date().toLocaleString()}`;
    const res = await fetch("/api/ops/thermal/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to create session");
    setSessionId(json.session.id);
    setSessionName(json.session.name);
    return json.session.id as string;
  }, [sessionId, sessionName]);

  const uploadOne = useCallback(async (sid: string, item: QueueItem) => {
    setQueue((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, status: "uploading" } : row)),
    );

    const presignRes = await fetch("/api/ops/thermal/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: "presign",
        sessionId: sid,
        filename: item.file.name,
        contentType: item.file.type || "application/octet-stream",
        sizeBytes: item.file.size,
      }),
    });
    const presign = await presignRes.json();
    if (!presignRes.ok) throw new Error(presign.error ?? "Presign failed");

    const putRes = await fetch(presign.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": item.file.type || "application/octet-stream" },
      body: item.file,
    });
    if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

    const finalizeRes = await fetch("/api/ops/thermal/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: "finalize",
        captureId: presign.captureId,
        storagePath: presign.storagePath,
        sizeBytes: item.file.size,
      }),
    });
    const finalized = await finalizeRes.json();
    if (!finalizeRes.ok) throw new Error(finalized.error ?? "Finalize failed");

    setQueue((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, status: "done" } : row)),
    );
  }, []);

  const handleUploadAll = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const sid = await ensureSession();
      for (const item of queue.filter((q) => q.status === "queued")) {
        try {
          await uploadOne(sid, item);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          setQueue((prev) =>
            prev.map((row) =>
              row.id === item.id ? { ...row, status: "error", message } : row,
            ),
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }, [ensureSession, queue, uploadOne]);

  const handleStartAnalysis = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const sid = await ensureSession();
      if (queue.some((q) => q.status === "queued")) {
        await handleUploadAll();
      }
      const res = await fetch("/api/ops/thermal/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, job_type: "extract" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to start analysis");
      router.push(`/thermal-studio/${sid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start analysis");
    } finally {
      setBusy(false);
    }
  }, [ensureSession, handleUploadAll, queue, router]);

  return (
    <div className="space-y-6">
      <div className={t.card}>
        <label className="block text-sm font-medium text-[var(--graphite-text-body)]">
          Session name
          <input
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Oak Ridge roof inspection"
            className="mt-2 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-transparent px-3 py-2 text-sm text-[var(--graphite-text-header)] outline-none focus:border-[var(--graphite-primary)]"
          />
        </label>
      </div>

      <label
        className={`${t.dropzone} ${dragActive ? "border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
      >
        <UploadCloud className="mb-3 h-8 w-8 text-[var(--graphite-primary)]" />
        <span className="text-sm font-semibold text-[var(--graphite-text-header)]">
          Drag &amp; drop thermal files here, or click to browse
        </span>
        <span className="mt-1 text-xs text-[var(--graphite-muted)]">
          HIKMICRO Pocket2 · Autel 640T · DJI Mavic 3T · FLIR R-JPEG
        </span>
        <input
          type="file"
          accept="image/*,.jpg,.jpeg,.tif,.tiff"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </label>

      {queue.length ? (
        <div className={t.card}>
          <p className={t.eyebrow}>Upload queue</p>
          <ul className="mt-3 space-y-2">
            {queue.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm text-[var(--graphite-text-body)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_6%,transparent)]"
              >
                <span className="truncate">{item.file.name}</span>
                <span className="shrink-0 capitalize text-[var(--graphite-muted)]">
                  {item.message ?? item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-[#fca5a5]">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button type="button" className={t.secondaryButton} disabled={busy || !queue.length} onClick={handleUploadAll}>
          Upload files ({readyCount}/{queue.length})
        </button>
        <button type="button" className={t.primaryButton} disabled={busy || !queue.length} onClick={handleStartAnalysis}>
          Start analysis
        </button>
        {sessionId ? (
          <Link href={`/thermal-studio/${sessionId}`} className={t.secondaryButton}>
            Open session
          </Link>
        ) : null}
      </div>
    </div>
  );
}
