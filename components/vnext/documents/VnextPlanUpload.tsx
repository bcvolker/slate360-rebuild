"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { projectId: string };

export function VnextPlanUpload({ projectId }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onFile(file: File) {
    setPending(true);
    setMessage(null);
    try {
      const pageCount = await readPdfPageCount(file);
      const reserved = await postJson(`/api/vnext/projects/${projectId}/plans/reserve`, {
        filename: file.name,
        size: file.size,
        pageCount,
      });
      if (!reserved.ok) {
        setMessage(reserved.error);
        return;
      }
      const uploaded = await fetch(reserved.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!uploaded.ok) {
        setMessage("The plan could not be uploaded.");
        return;
      }
      const committed = await postJson(`/api/vnext/projects/${projectId}/plans`, {
        fileId: reserved.fileId,
        pageCount,
      });
      if (!committed.ok) {
        setMessage(committed.error);
        return;
      }
      setMessage(committed.status === "failed" ? "The plan could not be prepared." : "Uploaded. Sheets appear when they are ready.");
      router.refresh();
    } catch {
      setMessage("The plan could not be uploaded.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center bg-[var(--vnext-accent)] px-4 text-[length:var(--vnext-body)] font-medium text-white disabled:opacity-60"
      >
        {pending ? "Uploading" : "Upload plans"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void onFile(file);
        }}
      />
      {message ? <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">{message}</p> : null}
    </div>
  );
}

async function readPdfPageCount(file: File): Promise<number> {
  const { pdfjs } = await import("react-pdf");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageCount = Math.max(1, Math.min(250, Math.floor(pdf.numPages || 1)));
  await pdf.destroy();
  return pageCount;
}

async function postJson(url: string, body: unknown): Promise<{ ok: true; uploadUrl: string; fileId: string; status?: string } | { ok: false; error: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as { error?: string; uploadUrl?: string; fileId?: string; status?: string } | null;
  if (!response.ok || !data) return { ok: false, error: data?.error ?? "The plan could not be uploaded." };
  return { ok: true, uploadUrl: data.uploadUrl ?? "", fileId: data.fileId ?? "", status: data.status };
}
