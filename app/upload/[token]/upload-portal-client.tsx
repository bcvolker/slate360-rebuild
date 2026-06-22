"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import {
  ExternalPortalShell,
  PortalGlassCard,
  PortalPrimaryCta,
  type PortalTokenState,
  TokenStatePage,
} from "@/components/external-portal";

type UploadedItem = {
  name: string;
  ok: boolean;
  message: string;
};

function mapUploadError(message: string): PortalTokenState | null {
  const lower = message.toLowerCase();
  if (lower.includes("expired")) return "expired";
  if (lower.includes("invalid") || lower.includes("403")) return "invalid";
  if (lower.includes("permission") || lower.includes("denied")) return "denied";
  return null;
}

export default function UploadPortalClient({
  token,
  folderId,
  projectName,
}: {
  token: string;
  folderId: string;
  projectName: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadedItem[]>([]);
  const [fatalState, setFatalState] = useState<PortalTokenState | null>(null);

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.length - successCount;
  const allSucceeded =
    results.length > 0 && successCount === results.length && !uploading;
  const partialSuccess =
    results.length > 0 && successCount > 0 && failCount > 0 && !uploading;

  const uploadFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    setUploading(true);
    const nextResults: UploadedItem[] = [];

    for (const file of files) {
      try {
        const reserveResponse = await fetch("/api/slatedrop/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            folderId,
            publicToken: token,
          }),
        });

        const reservePayload = await reserveResponse.json().catch(() => ({}));
        if (!reserveResponse.ok) {
          const msg = String(reservePayload?.error ?? "Failed to reserve upload URL");
          const mapped = mapUploadError(msg);
          if (mapped) {
            setFatalState(mapped);
            setUploading(false);
            return;
          }
          throw new Error(msg);
        }

        const putResponse = await fetch(reservePayload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!putResponse.ok) throw new Error("Upload to storage failed");

        const completeResponse = await fetch("/api/slatedrop/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: reservePayload.fileId, publicToken: token }),
        });
        if (!completeResponse.ok) {
          const completePayload = await completeResponse.json().catch(() => ({}));
          const msg = String(completePayload?.error ?? "Upload finalization failed");
          const mapped = mapUploadError(msg);
          if (mapped) {
            setFatalState(mapped);
            setUploading(false);
            return;
          }
          throw new Error(msg);
        }

        nextResults.push({ name: file.name, ok: true, message: "Uploaded" });
      } catch (error) {
        nextResults.push({
          name: file.name,
          ok: false,
          message: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    setResults((prev) => [...nextResults, ...prev].slice(0, 20));
    setUploading(false);
  };

  if (fatalState) {
    return <TokenStatePage state={fatalState} badge="File upload" />;
  }

  if (allSucceeded && results.length > 0) {
    return (
      <TokenStatePage
        state="success"
        badge="File upload"
        title="Upload complete"
        description={`${successCount} file${successCount === 1 ? "" : "s"} delivered securely to ${projectName}. You may close this window.`}
        actions={
          <PortalPrimaryCta type="button" onClick={() => setResults([])}>
            Upload more files
          </PortalPrimaryCta>
        }
      />
    );
  }

  return (
    <ExternalPortalShell
      portalLabel="File upload"
      title="SlateDrop request upload"
      subtitle={`Secure delivery for ${projectName}`}
      orgName={projectName}
    >
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:px-6">
        {partialSuccess ? (
          <div className="mb-4 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-[var(--graphite-text-body)]">
            <span className="font-semibold text-white">
              {successCount} of {results.length} files uploaded.
            </span>{" "}
            Review failed items below, then add any remaining files.
          </div>
        ) : null}

        <PortalGlassCard>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              if (!uploading) void uploadFiles(event.dataTransfer.files);
            }}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
              dragOver
                ? "border-[color-mix(in_srgb,var(--graphite-primary)_60%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_6%,transparent)]"
                : "border-white/15 bg-white/[0.02]"
            }`}
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              {uploading ? (
                <Loader2 size={24} className="animate-spin text-[var(--graphite-primary)]" />
              ) : (
                <UploadCloud size={24} className="text-[var(--graphite-primary)]" />
              )}
            </div>

            <p className="text-sm font-semibold text-white">
              {uploading ? "Uploading files…" : "Drag and drop files here"}
            </p>
            <p className="mt-1 text-xs text-slate-400">or</p>

            <PortalPrimaryCta
              type="button"
              className="mt-4"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              Select files
            </PortalPrimaryCta>

            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files && !uploading) void uploadFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </div>

          {results.length === 0 ? (
            <p className="mt-4 text-center text-xs text-slate-400">
              No files uploaded yet. Add one or more files to deliver them to the project folder.
            </p>
          ) : (
            <ul className="mt-6 space-y-2">
              {results.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                    item.ok
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                      : "border-red-500/30 bg-red-500/10 text-red-100"
                  }`}
                >
                  <span className="truncate pr-3">{item.name}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
                    {item.ok ? <CheckCircle2 size={12} aria-hidden /> : null}
                    {item.message}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {partialSuccess ? (
            <div className="mt-4 flex justify-center">
              <PortalPrimaryCta
                type="button"
                onClick={() => {
                  if (failCount === 0) return;
                  setResults((prev) => prev.filter((r) => r.ok));
                }}
              >
                Dismiss failed items
              </PortalPrimaryCta>
            </div>
          ) : null}
        </PortalGlassCard>
      </main>
    </ExternalPortalShell>
  );
}
