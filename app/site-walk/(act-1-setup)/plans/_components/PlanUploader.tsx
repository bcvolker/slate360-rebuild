"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileUp } from "lucide-react";
import type { PlanRoomPayload, PlanRoomProject, UploadState } from "./plan-room-types";

type FolderResponse = { folders?: Array<{ id: string; name: string; folder_path?: string; path?: string; project_id?: string }> ; error?: string };
type FolderCreateResponse = { id?: string; name?: string; folder_path?: string; error?: string };
type UploadUrlResponse = { uploadUrl?: string; fileId?: string; s3Key?: string; error?: string; message?: string };

type Props = {
  project: PlanRoomProject | null;
  onPlanRoomChange: (payload: PlanRoomPayload) => void;
};

const defaultState: UploadState = { stage: "idle", message: "Drop a PDF plan set here, or choose a file." };

export function PlanUploader({ project, onPlanRoomChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>(defaultState);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (!file) return;
    if (!project) return setState({ stage: "error", message: "Select or create a project before uploading plans." });
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return setState({ stage: "error", message: "Plan Room accepts PDF plan sets only." });
    }

    try {
      setState({ stage: "uploading", message: `Uploading ${file.name} to SlateDrop…` });
      const folder = await ensurePlansFolder(project.id);
      const reserved = await reserveSlateDropUpload(file, folder.id, folder.path);
      await uploadToStorage(file, reserved.uploadUrl ?? "");
      await completeSlateDropUpload(reserved.fileId ?? "");

      setState({ stage: "processing", message: "Processing Sheets… Creating plan set and sheet rows." });
      const payload = await createPlanSet(project.id, file, reserved.fileId ?? "", reserved.s3Key ?? "");
      onPlanRoomChange(payload);
      setState({ stage: "complete", message: "Complete — plan set is saved in Site Walk Files / Plans." });
    } catch (error) {
      setState({ stage: "error", message: error instanceof Error ? error.message : "Plan upload failed." });
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFiles(event.dataTransfer.files);
  }

  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Upload</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Plan set PDF</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">Uploads route through SlateDrop into Site Walk Files / Plans.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={!project || state.stage === "uploading" || state.stage === "processing"} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60">
          <FileUp className="h-4 w-4" /> Choose PDF
        </button>
      </div>

      <div onDrop={handleDrop} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} className={`mt-5 rounded-3xl bg-slate-50 p-8 text-center transition ${dragging ? "ring-2 ring-blue-600" : "ring-1 ring-slate-300"}`}>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => event.target.files && void handleFiles(event.target.files)} />
        <FileUp className="mx-auto h-10 w-10 text-blue-700" />
        <p className="mt-3 text-lg font-black text-slate-900">Drag a construction plan PDF here</p>
        <p className="mt-1 text-sm text-slate-700">Large files can take a moment. The status below stays visible through upload and sheet processing.</p>
      </div>

      <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${statusClasses(state.stage)}`}>{state.message}</div>
    </section>
  );
}

async function ensurePlansFolder(projectId: string) {
  const folders = await loadFolders(projectId);
  const existing = folders.find((folder) => folder.name === "Plans" && folder.path.includes("Site Walk Files"));
  if (existing) return existing;
  const parent = folders.find((folder) => folder.name === "Site Walk Files") ?? await createFolder(projectId, "Site Walk Files", null);
  return createFolder(projectId, "Plans", parent.id);
}

async function loadFolders(projectId: string) {
  const response = await fetch(`/api/slatedrop/folders?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as FolderResponse;
  return (data.folders ?? []).map((folder) => ({ id: folder.id, name: folder.name, path: folder.folder_path ?? folder.path ?? folder.name }));
}

async function createFolder(projectId: string, name: string, parentFolderId: string | null) {
  const response = await fetch("/api/slatedrop/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, name, parentFolderId }) });
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as FolderCreateResponse;
  if (!data.id) throw new Error(`Could not create ${name} folder.`);
  return { id: data.id, name: data.name ?? name, path: data.folder_path ?? name };
}

async function reserveSlateDropUpload(file: File, folderId: string, folderPath: string) {
  const response = await fetch("/api/slatedrop/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type || "application/pdf", size: file.size, folderId, folderPath, app_context: "site_walk" }) });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as UploadUrlResponse;
}

async function uploadToStorage(file: File, uploadUrl: string) { if (!uploadUrl) throw new Error("Upload reservation failed."); const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/pdf" }, body: file }); if (!response.ok) throw new Error("Storage upload failed."); }
async function completeSlateDropUpload(fileId: string) { const response = await fetch("/api/slatedrop/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId }) }); if (!response.ok) throw new Error(await readError(response)); }
async function createPlanSet(projectId: string, file: File, fileId: string, s3Key: string) { const response = await fetch("/api/site-walk/plan-sets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, fileId, s3Key, title: file.name.replace(/\.pdf$/i, ""), originalFileName: file.name, mimeType: file.type || "application/pdf", fileSize: file.size, pageCount: 1 }) }); if (!response.ok) throw new Error(await readError(response)); return (await response.json()) as PlanRoomPayload; }
async function readError(response: Response) { const data = (await response.json().catch(() => null)) as { error?: string; message?: string } | null; return data?.error ?? data?.message ?? "Request failed"; }
function statusClasses(stage: UploadState["stage"]) { if (stage === "complete") return "bg-emerald-50 text-emerald-800"; if (stage === "error") return "bg-rose-50 text-rose-800"; if (stage === "uploading" || stage === "processing") return "bg-blue-50 text-blue-900"; return "bg-slate-50 text-slate-700"; }
