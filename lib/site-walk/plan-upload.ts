/**
 * Plan-set upload pipeline — shared orchestration.
 *
 * Extracted from components/site-walk/PlanUploaderCard.tsx so any surface
 * (the Graphite-Glass Plans tab, the walk-start sheet) can add a plan without
 * copying the SlateDrop → plan-set → sheets → rasterize sequence or inheriting
 * the legacy amber UI. UI is the caller's concern; this is logic only.
 */

import { pdfjs } from "react-pdf";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export type PlanUploadStage =
  | "reading"
  | "uploading"
  | "processing"
  | "complete"
  | "error";

export type PlanUploadProgress = { stage: PlanUploadStage; message: string };

export type PlanUploadResult = { planSets: SiteWalkPlanSet[]; sheets: SiteWalkPlanSheet[] };

export class PlanUploadError extends Error {}

/** True when the file looks like a PDF plan set. */
export function isPdfPlan(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/**
 * Runs the full add-a-plan pipeline for a project, reporting progress through
 * `onProgress`. Resolves with the created plan set + sheet rows. Rasterization
 * continues in the background server-side; the plan appears when ready.
 */
export async function uploadPlanSet(
  projectId: string,
  file: File,
  onProgress: (p: PlanUploadProgress) => void,
): Promise<PlanUploadResult> {
  if (!isPdfPlan(file)) {
    throw new PlanUploadError("Plans accepts PDF plan sets only.");
  }

  onProgress({ stage: "reading", message: `Preparing ${file.name}…` });
  const pageCount = await readPdfPageCount(file);

  onProgress({ stage: "uploading", message: `Uploading ${file.name} to SlateDrop…` });
  const folder = await ensurePlansFolder(projectId);
  const reserved = await reserveSlateDropUpload(file, folder.id, folder.path);
  if (!reserved.uploadUrl || !reserved.fileId || !reserved.s3Key) {
    throw new PlanUploadError("Upload reservation did not return complete SlateDrop metadata.");
  }
  await uploadToStorage(file, reserved.uploadUrl);
  await completeSlateDropUpload(reserved.fileId);

  onProgress({ stage: "processing", message: "Creating plan set…" });
  const created = await createPlanSet(projectId, file, reserved.fileId, reserved.s3Key, pageCount);
  const planSet = created.planSets[0];
  if (!planSet) throw new PlanUploadError("Plan set was created, but the server response was incomplete.");

  onProgress({ stage: "processing", message: `Generating ${pageCount} sheet${pageCount === 1 ? "" : "s"}…` });
  const extracted = await autoCreateSheets(planSet.id, pageCount);

  onProgress({ stage: "processing", message: "Sending plan to the converter…" });
  await startRasterization(planSet.id);

  onProgress({ stage: "complete", message: "Uploaded — conversion started. The plan appears automatically when ready." });
  return extracted;
}

// ── pipeline steps ──────────────────────────────────────────────────────────

type FolderRef = { id: string; name: string; path: string };

async function ensurePlansFolder(projectId: string): Promise<FolderRef> {
  const folders = await loadFolders(projectId);
  const existing = folders.find((f) => f.name === "Plans" && f.path.includes("Site Walk Files"));
  if (existing) return existing;
  const parent =
    folders.find((f) => f.name === "Site Walk Files") ??
    (await createFolder(projectId, "Site Walk Files", null));
  return createFolder(projectId, "Plans", parent.id);
}

async function loadFolders(projectId: string): Promise<FolderRef[]> {
  const res = await fetch(`/api/slatedrop/folders?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
  if (!res.ok) throw new PlanUploadError(await readError(res));
  const data = (await res.json()) as {
    folders?: Array<{ id: string; name: string; folder_path?: string; path?: string }>;
  };
  return (data.folders ?? []).map((f) => ({ id: f.id, name: f.name, path: f.folder_path ?? f.path ?? f.name }));
}

async function createFolder(projectId: string, name: string, parentFolderId: string | null): Promise<FolderRef> {
  const res = await fetch("/api/slatedrop/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, name, parentFolderId }),
  });
  if (!res.ok) throw new PlanUploadError(await readError(res));
  const data = (await res.json()) as {
    id?: string; name?: string; folder_path?: string;
    folder?: { id?: string; name?: string; folder_path?: string };
  };
  const folder = data.folder ?? data;
  if (!folder.id) throw new PlanUploadError(`Could not create ${name} folder.`);
  return { id: folder.id, name: folder.name ?? name, path: folder.folder_path ?? name };
}

async function reserveSlateDropUpload(file: File, folderId: string, folderPath: string) {
  const res = await fetch("/api/slatedrop/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: planPdfContentType(file),
      size: file.size,
      folderId,
      folderPath,
      app_context: "site_walk",
    }),
  });
  if (!res.ok) throw new PlanUploadError(await readError(res));
  return (await res.json()) as { uploadUrl?: string; fileId?: string; s3Key?: string };
}

async function uploadToStorage(file: File, uploadUrl: string) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": planPdfContentType(file) },
    body: file,
  });
  if (!res.ok) throw new PlanUploadError("Storage upload failed.");
}

async function completeSlateDropUpload(fileId: string) {
  const res = await fetch("/api/slatedrop/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  });
  if (!res.ok) throw new PlanUploadError(await readError(res));
}

async function createPlanSet(
  projectId: string,
  file: File,
  fileId: string,
  s3Key: string,
  pageCount: number,
): Promise<PlanUploadResult> {
  const res = await fetch("/api/site-walk/plan-sets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      fileId,
      s3Key,
      title: file.name.replace(/\.pdf$/i, ""),
      originalFileName: file.name,
      mimeType: planPdfContentType(file),
      fileSize: file.size,
      pageCount,
    }),
  });
  if (!res.ok) throw new PlanUploadError(await readError(res));
  return normalizePlanPayload(await res.json(), "Plan set was created, but the server response was incomplete.");
}

async function autoCreateSheets(planSetId: string, pageCount: number): Promise<PlanUploadResult> {
  const res = await fetch(`/api/site-walk/plan-sets/${encodeURIComponent(planSetId)}/sheets/auto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageCount }),
  });
  if (!res.ok) throw new PlanUploadError(await readError(res));
  return normalizePlanPayload(await res.json(), "Sheet extraction completed, but the server response was incomplete.");
}

async function startRasterization(planSetId: string) {
  const res = await fetch(`/api/site-walk/plan-sets/${encodeURIComponent(planSetId)}/rasterize`, { method: "POST" });
  const data = (await res.json().catch(() => null)) as { status?: string; error?: string; message?: string } | null;
  if (!res.ok) throw new PlanUploadError(data?.error ?? data?.message ?? "Could not start conversion.");
  if (data?.status === "failed" || data?.error) throw new PlanUploadError(data.error ?? data.message ?? "Conversion failed to start.");
}

// ── helpers ───────────────────────────────────────────────────────────────

function normalizePlanPayload(raw: unknown, incompleteMessage: string): PlanUploadResult {
  const data = raw as PlanUploadResult & { planSet?: SiteWalkPlanSet };
  if ((!data.planSets || data.planSets.length === 0) && data.planSet) {
    return { planSets: [data.planSet], sheets: data.sheets ?? [] };
  }
  if (!data.planSets) throw new PlanUploadError(incompleteMessage);
  return { planSets: data.planSets, sheets: data.sheets ?? [] };
}

async function readPdfPageCount(file: File): Promise<number> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageCount = Math.max(1, Math.min(250, Math.floor(pdf.numPages || 1)));
  await pdf.destroy();
  return pageCount;
}

function planPdfContentType(file: File): string {
  return file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : file.type || "application/pdf";
}

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  return data?.error ?? data?.message ?? "Request failed";
}
