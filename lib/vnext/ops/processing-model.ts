export type ProcessingFilter = "all" | "running" | "failed" | "completed";

export type ProcessingRow = {
  id: string;
  projectId: string;
  projectName: string;
  source: string;
  kind: string;
  stage: string | null;
  status: "queued" | "processing" | "completed" | "failed";
  statusLabel: string;
  occurredAt: string | null;
  error: string | null;
  progressPct: number | null;
  output: string | null;
};

export function processingGroup(status: ProcessingRow["status"]): "running" | "failed" | "completed" {
  if (status === "failed") return "failed";
  if (status === "completed") return "completed";
  return "running";
}

export function mapJobStatus(raw: string | null): ProcessingRow["status"] | null {
  const value = (raw ?? "").toLowerCase();
  if (value === "queued" || value === "pending" || value === "uploading") return "queued";
  if (value === "processing") return "processing";
  if (value === "completed" || value === "ready") return "completed";
  if (value === "failed") return "failed";
  return null;
}

export function statusLabel(status: ProcessingRow["status"]): string {
  if (status === "queued") return "Queued";
  if (status === "processing") return "Processing";
  if (status === "completed") return "Completed";
  return "Failed";
}

export function planStage(status: string | null): string | null {
  const value = (status ?? "").toLowerCase();
  if (value === "pending") return "upload";
  if (value === "processing") return "rasterizing";
  if (value === "ready") return "ready";
  if (value === "failed") return "failed";
  return null;
}

export function workerProgress(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function filterProcessingRows(rows: readonly ProcessingRow[], filter: ProcessingFilter, query: string): ProcessingRow[] {
  const q = query.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    if (filter !== "all" && processingGroup(row.status) !== filter) return false;
    if (!q) return true;
    return [row.projectName, row.source, row.kind, row.stage ?? ""].join(" ").toLocaleLowerCase().includes(q);
  });
}
