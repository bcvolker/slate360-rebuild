import type { LatLng } from "@/lib/projects/location";

export type MapSnapshotInput = {
  projectName: string;
  address: string;
  center: LatLng;
  zoom: number;
  boundary: LatLng[];
};

type ProjectFolderRow = {
  id: string;
  name: string;
  path: string;
};

function buildBoundaryPath(boundary: LatLng[]): string | null {
  if (boundary.length < 3) return null;
  const coords = boundary.map((point) => `${point.lat},${point.lng}`);
  coords.push(coords[0]);
  return `weight:3|color:0xF59E0BFF|fillcolor:0xF59E0B33|${coords.join("|")}`;
}

export function buildStaticMapQuery(input: MapSnapshotInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("center", `${input.center.lat},${input.center.lng}`);
  params.set("zoom", String(Math.round(input.zoom)));
  params.set("size", "800x450");
  params.set("maptype", "satellite");
  params.append("markers", `color:0xF59E0B|${input.center.lat},${input.center.lng}`);

  const boundaryPath = buildBoundaryPath(input.boundary);
  if (boundaryPath) {
    params.append("path", boundaryPath);
  }

  return params;
}

async function fetchStaticMapImage(params: URLSearchParams): Promise<string | null> {
  try {
    const response = await fetch(`/api/static-map?${params.toString()}`);
    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function sanitizeFilenamePart(value: string): string {
  return value.trim().replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 48);
}

export async function createMapSnapshotPdf(
  input: MapSnapshotInput,
): Promise<{ blob: Blob; filename: string }> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const mapImgData = await fetchStaticMapImage(buildStaticMapQuery(input));
  const generatedAt = new Date().toLocaleString();
  const filename = `map-snapshot-${sanitizeFilenamePart(input.projectName) || "project"}-${Date.now()}.pdf`;

  if (mapImgData) {
    const imgW = pageW - margin * 2;
    const imgH = pageH * 0.6;
    pdf.addImage(mapImgData, "PNG", margin, margin, imgW, imgH);

    let y = margin + imgH + 6;
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text("SLATE360 — Map Snapshot", margin, y);
    y += 6;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Project: ${input.projectName}`, margin, y);
    y += 4;
    pdf.text(`Generated: ${generatedAt}`, margin, y);
    y += 4;
    if (input.address) {
      pdf.text(`Location: ${input.address}`, margin, y);
      y += 4;
    }
    pdf.text(
      `Center: ${input.center.lat.toFixed(6)}, ${input.center.lng.toFixed(6)}`,
      margin,
      y,
    );
    y += 4;
    if (input.boundary.length >= 3) {
      pdf.text(`Site boundary: ${input.boundary.length} points`, margin, y);
    }
  } else {
    let y = 20;
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("SLATE360 — Map Snapshot", 14, y);
    y += 10;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Project: ${input.projectName}`, 14, y);
    y += 6;
    pdf.text(`Generated: ${generatedAt}`, 14, y);
    y += 6;
    if (input.address) {
      pdf.text(`Location: ${input.address}`, 14, y);
      y += 6;
    }
    pdf.text(
      `Center: ${input.center.lat.toFixed(6)}, ${input.center.lng.toFixed(6)}`,
      14,
      y,
    );
  }

  return { blob: pdf.output("blob"), filename };
}

async function resolveDocumentsFolder(projectId: string): Promise<ProjectFolderRow> {
  const response = await fetch(
    `/api/slatedrop/project-folders?projectId=${encodeURIComponent(projectId)}`,
    { cache: "no-store" },
  );
  const payload = (await response.json().catch(() => ({}))) as { folders?: ProjectFolderRow[] };
  const folders = Array.isArray(payload.folders) ? payload.folders : [];
  const documentsFolder = folders.find((folder) => folder.name.toLowerCase() === "documents");
  if (!documentsFolder) {
    throw new Error("Documents folder not found for this project.");
  }
  return documentsFolder;
}

export async function saveMapSnapshotToDocuments(
  projectId: string,
  blob: Blob,
  filename: string,
): Promise<{ fileId: string }> {
  const folder = await resolveDocumentsFolder(projectId);

  const urlResponse = await fetch("/api/slatedrop/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename,
      contentType: "application/pdf",
      size: blob.size,
      folderId: folder.id,
      folderPath: folder.path,
    }),
  });
  const urlData = (await urlResponse.json().catch(() => ({}))) as {
    uploadUrl?: string;
    fileId?: string;
    error?: string;
  };
  if (!urlResponse.ok || !urlData.uploadUrl || !urlData.fileId) {
    throw new Error(urlData.error ?? "Failed to reserve upload.");
  }

  const uploadResponse = await fetch(urlData.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: blob,
  });
  if (!uploadResponse.ok) {
    throw new Error("Upload failed.");
  }

  const completeResponse = await fetch("/api/slatedrop/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId: urlData.fileId }),
  });
  if (!completeResponse.ok) {
    throw new Error("Upload finalization failed.");
  }

  return { fileId: urlData.fileId };
}
