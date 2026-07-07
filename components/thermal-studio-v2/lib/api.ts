/**
 * Client-side calls into the existing (unchanged) /api/ops/thermal/** backend.
 * No new routes — this only wraps the same contracts the old thermal UI uses.
 */

export type JobDispatchResult = { ok: boolean; message: string };

export async function dispatchThermalJob(
  sessionId: string,
  jobType: "extract" | "extract_analyze" | "align" | "analyze" | "report" | "full_pipeline",
  captureIds: string[],
): Promise<JobDispatchResult> {
  if (!captureIds.length) return { ok: false, message: "Nothing selected" };
  try {
    const res = await fetch("/api/ops/thermal/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, job_type: jobType, capture_ids: captureIds }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, message: (body?.error as string) ?? `Failed (${res.status})` };
    }
    return { ok: true, message: "Job queued" };
  } catch {
    return { ok: false, message: "Network error — job not queued" };
  }
}

export type SlateDropProject = { id: string; name: string };
export type SlateDropImageFile = {
  id: string;
  file_name: string;
  file_type: string;
  folder_id: string;
  folder_name: string;
  previewUrl: string | null;
};
export type SlateDropFolder = { id: string; name: string; count: number };

export async function listThermalProjects(): Promise<SlateDropProject[]> {
  try {
    const res = await fetch("/api/ops/thermal/projects");
    if (!res.ok) return [];
    const json = await res.json();
    return (json.projects ?? []) as SlateDropProject[];
  } catch {
    return [];
  }
}

export async function listSlateDropImages(
  projectId: string,
): Promise<{ files: SlateDropImageFile[]; folders: SlateDropFolder[] }> {
  try {
    const res = await fetch(`/api/ops/thermal/slatedrop-images?projectId=${encodeURIComponent(projectId)}`);
    if (!res.ok) return { files: [], folders: [] };
    const json = await res.json();
    return { files: json.files ?? [], folders: json.folders ?? [] };
  } catch {
    return { files: [], folders: [] };
  }
}

export async function importSlateDropUploads(sessionId: string, uploadIds: string[]): Promise<JobDispatchResult> {
  if (!uploadIds.length) return { ok: false, message: "Nothing selected" };
  try {
    const res = await fetch(`/api/ops/thermal/sessions/${sessionId}/import-slatedrop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadIds }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, message: (body?.error as string) ?? `Failed (${res.status})` };
    }
    return { ok: true, message: `Imported ${uploadIds.length}` };
  } catch {
    return { ok: false, message: "Network error — import failed" };
  }
}

/** Two-phase upload for a raw radiometric file (presign → PUT → finalize). */
export async function uploadThermalFile(
  sessionId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<JobDispatchResult> {
  try {
    const presign = await fetch("/api/ops/thermal/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: "presign",
        sessionId,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      }),
    });
    if (!presign.ok) return { ok: false, message: `Presign failed (${presign.status})` };
    const { captureId, storagePath, signedUrl } = await presign.json();
    if (!signedUrl || !captureId) return { ok: false, message: "Presign response missing fields" };

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedUrl);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
      xhr.onerror = () => reject(new Error("Upload network error"));
      xhr.send(file);
    });

    const finalize = await fetch("/api/ops/thermal/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: "finalize",
        captureId,
        storagePath,
        sizeBytes: file.size,
      }),
    });
    if (!finalize.ok) return { ok: false, message: `Finalize failed (${finalize.status})` };
    return { ok: true, message: "Uploaded" };
  } catch {
    return { ok: false, message: "Upload failed" };
  }
}
