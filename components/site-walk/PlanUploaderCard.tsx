"use client";

/**
 * PlanUploaderCard — standalone plan PDF uploader.
 *
 * Transplanted from app/site-walk/(act-1-setup)/plans/_components/PlanUploader.tsx
 * so it can be imported in the walk-creation flow (StartWalkForm) and elsewhere.
 *
 * Accepts any object with { id, name } as the project prop.
 */

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { FileUp } from "lucide-react";
import { pdfjs } from "react-pdf";
import GlassCard from "@/components/shared/GlassCard";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

// ── inline types ──────────────────────────────────────────────────────────────

type PlanRoomProject = { id: string; name: string; description?: string | null };

type PlanRoomPayload = { planSets: SiteWalkPlanSet[]; sheets: SiteWalkPlanSheet[] };

type UploadStage = "idle" | "uploading" | "processing" | "complete" | "error";

type UploadState = { stage: UploadStage; message: string };

type FolderResponse = {
  folders?: Array<{ id: string; name: string; folder_path?: string; path?: string; project_id?: string }>;
  error?: string;
};
type FolderCreateResponse = {
  id?: string;
  name?: string;
  folder_path?: string;
  folder?: { id?: string; name?: string; folder_path?: string };
  error?: string;
};
type UploadUrlResponse = {
  uploadUrl?: string;
  fileId?: string;
  s3Key?: string;
  error?: string;
  message?: string;
};

// ── component ─────────────────────────────────────────────────────────────────

type Props = {
  project: PlanRoomProject | null;
  onPlanRoomChange?: (payload: PlanRoomPayload) => void;
};

const defaultState: UploadState = { stage: "idle", message: "Drop a PDF plan set here, or choose a file." };

export function PlanUploaderCard({ project, onPlanRoomChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>(defaultState);
  const [dragging, setDragging] = useState(false);
  const canSelectFile = Boolean(project) && state.stage !== "uploading" && state.stage !== "processing";

  async function handleFiles(files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (!file) return;
    if (!project) return setState({ stage: "error", message: "Select or create a project before uploading plans." });
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return setState({ stage: "error", message: "Plan Room accepts PDF plan sets only." });
    }

    try {
      setState({ stage: "uploading", message: `Preparing ${file.name}…` });
      const pageCount = await readPdfPageCount(file);
      setState({ stage: "uploading", message: `Uploading ${file.name} to SlateDrop…` });
      const folder = await ensurePlansFolder(project.id);
      const reserved = await reserveSlateDropUpload(file, folder.id, folder.path);
      if (!reserved.uploadUrl || !reserved.fileId || !reserved.s3Key) throw new Error("Upload reservation did not return complete SlateDrop metadata.");
      await uploadToStorage(file, reserved.uploadUrl);
      await completeSlateDropUpload(reserved.fileId);

      setState({ stage: "processing", message: "Processing Sheets… Creating plan set." });
      const payload = await createPlanSet(project.id, file, reserved.fileId, reserved.s3Key, pageCount);
      const planSet = payload.planSets[0];
      if (!planSet) throw new Error("Plan set was created, but the server response was incomplete.");
      setState({ stage: "processing", message: `Generating ${pageCount} plan sheet row${pageCount === 1 ? "" : "s"}…` });
      const extracted = await autoCreateSheets(planSet.id, pageCount);
      // Trigger background rasterization — intentionally fire-and-forget
      fetch(`/api/site-walk/plan-sets/${encodeURIComponent(planSet.id)}/rasterize`, { method: "POST" }).catch((e) =>
        console.error("Rasterization background trigger failed", e),
      );
      onPlanRoomChange?.(extracted);
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

  function openFilePicker() {
    if (canSelectFile) inputRef.current?.click();
  }

  function handlePickerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  }

  return (
    <GlassCard className="p-4 sm:p-5">
      <div
        onClick={openFilePicker}
        onKeyDown={handlePickerKeyDown}
        onDrop={handleDrop}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        role="button"
        tabIndex={0}
        aria-disabled={!canSelectFile}
        className={`relative cursor-pointer rounded-3xl border border-dashed border-white/15 bg-white/[0.04] p-6 text-center transition focus:outline-none focus:ring-2 focus:ring-amber-500 sm:p-10 ${dragging ? "ring-2 ring-amber-500" : ""} ${canSelectFile ? "" : "opacity-60"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => event.target.files && void handleFiles(event.target.files)}
        />
        <FileUp className="mx-auto h-10 w-10 text-amber-400" />
        <p className="mt-3 text-base font-black text-white sm:text-lg">
          {project ? "Tap to choose a PDF or drag it here" : "Pick a project above to upload a plan set"}
        </p>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">PDFs route through SlateDrop into Site Walk Files / Plans.</p>
      </div>
      <div className={`mt-3 rounded-2xl px-3 py-2 text-xs font-black sm:text-sm ${statusClasses(state.stage)}`}>
        {state.message}
      </div>
    </GlassCard>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

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
  const folder = data.folder ?? data;
  if (!folder.id) throw new Error(`Could not create ${name} folder.`);
  return { id: folder.id, name: folder.name ?? name, path: folder.folder_path ?? name };
}

async function reserveSlateDropUpload(file: File, folderId: string, folderPath: string) {
  const response = await fetch("/api/slatedrop/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: planPdfContentType(file), size: file.size, folderId, folderPath, app_context: "site_walk" }) });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as UploadUrlResponse;
}

async function uploadToStorage(file: File, uploadUrl: string) {
  const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": planPdfContentType(file) }, body: file });
  if (!response.ok) throw new Error("Storage upload failed.");
}

async function completeSlateDropUpload(fileId: string) {
  const response = await fetch("/api/slatedrop/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId }) });
  if (!response.ok) throw new Error(await readError(response));
}

async function createPlanSet(projectId: string, file: File, fileId: string, s3Key: string, pageCount: number) {
  const response = await fetch("/api/site-walk/plan-sets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, fileId, s3Key, title: file.name.replace(/\.pdf$/i, ""), originalFileName: file.name, mimeType: planPdfContentType(file), fileSize: file.size, pageCount }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as PlanRoomPayload & { planSet?: PlanRoomPayload["planSets"][number] };
  if ((!data.planSets || data.planSets.length === 0) && data.planSet) return { planSets: [data.planSet], sheets: data.sheets ?? [] };
  if (!data.planSets) throw new Error("Plan set was created, but the server response was incomplete.");
  return { planSets: data.planSets, sheets: data.sheets ?? [] };
}

async function autoCreateSheets(planSetId: string, pageCount: number) {
  const response = await fetch(`/api/site-walk/plan-sets/${encodeURIComponent(planSetId)}/sheets/auto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageCount }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as PlanRoomPayload & { planSet?: PlanRoomPayload["planSets"][number] };
  if ((!data.planSets || data.planSets.length === 0) && data.planSet) return { planSets: [data.planSet], sheets: data.sheets ?? [] };
  if (!data.planSets) throw new Error("Sheet extraction completed, but the server response was incomplete.");
  return { planSets: data.planSets, sheets: data.sheets ?? [] };
}

async function readPdfPageCount(file: File) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageCount = Math.max(1, Math.min(250, Math.floor(pdf.numPages || 1)));
  await pdf.destroy();
  return pageCount;
}

function planPdfContentType(file: File) {
  return file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : file.type || "application/pdf";
}

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
  return data?.error ?? data?.message ?? "Request failed";
}

function statusClasses(stage: UploadStage) {
  if (stage === "complete") return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20";
  if (stage === "error") return "bg-rose-500/10 text-rose-300 border border-rose-500/20";
  if (stage === "uploading" || stage === "processing") return "bg-amber-500/10 text-amber-200 border border-amber-500/20";
  return "bg-white/[0.04] text-slate-300 border border-white/10";
}
