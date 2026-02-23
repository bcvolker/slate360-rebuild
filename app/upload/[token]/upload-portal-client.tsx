"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";

type UploadedItem = {
  name: string;
  ok: boolean;
  message: string;
};

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
          throw new Error(reservePayload?.error ?? "Failed to reserve upload URL");
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
        if (!completeResponse.ok) throw new Error("Upload finalization failed");

        nextResults.push({ name: file.name, ok: true, message: "Uploaded successfully" });
      } catch (error) {
        nextResults.push({
          name: file.name,
          ok: false,
          message: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    setResults((prev) => [...nextResults, ...prev].slice(0, 12));
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#F7F8FA] p-6 md:p-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-black text-gray-900">SlateDrop Request Upload</h1>
            <p className="mt-2 text-sm text-gray-500">
              Secure file delivery portal for <span className="font-semibold text-gray-700">{projectName}</span>
            </p>
          </div>

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
            className={`mt-6 rounded-2xl border-2 border-dashed p-8 text-center transition ${
              dragOver ? "border-[#FF4D00] bg-[#FF4D00]/5" : "border-gray-300 bg-gray-50"
            }`}
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              {uploading ? <Loader2 size={24} className="animate-spin text-[#FF4D00]" /> : <UploadCloud size={24} className="text-[#FF4D00]" />}
            </div>

            <p className="text-sm font-semibold text-gray-800">
              {uploading ? "Uploading files…" : "Drag and drop files here"}
            </p>
            <p className="mt-1 text-xs text-gray-500">or</p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "#FF4D00" }}
            >
              Select Files
            </button>

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

          {results.length > 0 ? (
            <div className="mt-6 space-y-2">
              {results.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                    item.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
                  }`}
                >
                  <span className="truncate pr-3">{item.name}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
                    {item.ok ? <CheckCircle2 size={12} /> : null}
                    {item.message}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
