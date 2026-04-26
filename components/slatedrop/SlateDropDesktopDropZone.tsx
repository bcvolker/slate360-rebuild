"use client";

import { useRef, useState, type DragEvent } from "react";
import { CheckCircle2, Loader2, UploadCloud, XCircle } from "lucide-react";

type UploadState = "idle" | "dragging" | "uploading" | "done" | "error";

type UploadUrlResponse = {
  uploadUrl?: string;
  fileId?: string;
  s3Key?: string;
  error?: string;
  message?: string;
};

type Props = {
  folderId: string;
  folderPath: string;
  label?: string;
};

export default function SlateDropDesktopDropZone({ folderId, folderPath, label = "Drop files here" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("Drag files from your desktop or choose files to upload.");
  const [uploaded, setUploaded] = useState(0);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setState("uploading");
    setUploaded(0);
    setMessage(`Uploading ${files.length} file${files.length === 1 ? "" : "s"}...`);

    try {
      for (const file of files) {
        const urlResponse = await fetch("/api/slatedrop/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            folderId,
            folderPath,
          }),
        });
        const urlPayload = (await urlResponse.json().catch(() => ({}))) as UploadUrlResponse;
        if (!urlResponse.ok || !urlPayload.uploadUrl || !urlPayload.fileId) {
          throw new Error(urlPayload.error ?? urlPayload.message ?? "Could not prepare upload");
        }

        const uploadResponse = await fetch(urlPayload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!uploadResponse.ok) throw new Error(`Upload failed for ${file.name}`);

        const completeResponse = await fetch("/api/slatedrop/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: urlPayload.fileId }),
        });
        if (!completeResponse.ok) throw new Error(`Could not finalize ${file.name}`);
        setUploaded((value) => value + 1);
      }

      setState("done");
      setMessage(`${files.length} file${files.length === 1 ? "" : "s"} uploaded to ${folderPath}.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Upload failed");
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setState("idle");
    void uploadFiles(event.dataTransfer.files);
  }

  return (
    <section
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault();
        if (state !== "uploading") setState("dragging");
      }}
      onDragLeave={() => state === "dragging" && setState("idle")}
      className={`hidden rounded-3xl border-2 border-dashed p-6 text-center shadow-sm transition-colors lg:block ${
        state === "dragging" ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) void uploadFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {state === "uploading" ? <Loader2 className="h-6 w-6 animate-spin" /> : state === "done" ? <CheckCircle2 className="h-6 w-6" /> : state === "error" ? <XCircle className="h-6 w-6 text-red-600" /> : <UploadCloud className="h-6 w-6" />}
      </div>
      <h2 className="mt-3 text-base font-black text-slate-950">{label}</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-slate-600">{message}</p>
      {state === "uploading" && <p className="mt-2 text-xs font-bold text-blue-700">{uploaded} uploaded so far</p>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state === "uploading"}
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-2xl bg-blue-700 px-4 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-60"
      >
        Choose files
      </button>
    </section>
  );
}
