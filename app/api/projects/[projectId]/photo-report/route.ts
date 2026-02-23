import { NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNamespace } from "@/lib/slatedrop/storage";
import { saveProjectArtifact, resolveProjectFolderIdByName } from "@/lib/slatedrop/projectArtifacts";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

const IMAGE_TYPES = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "heic", "bmp"]);

function safeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function addWrappedLine(pdf: jsPDF, text: string, yRef: { y: number }, pageHeight: number, margin: number) {
  const lines = pdf.splitTextToSize(text, 530);
  for (const line of lines) {
    if (yRef.y > pageHeight - margin) {
      pdf.addPage();
      yRef.y = margin;
    }
    pdf.text(line, margin, yRef.y);
    yRef.y += 14;
  }
}

export async function POST(_req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let orgId: string | null = null;
  try {
    const { data } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    orgId = data?.org_id ?? null;
  } catch {
    orgId = null;
  }

  let projectQuery = admin
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .limit(1);
  projectQuery = orgId ? projectQuery.eq("org_id", orgId) : projectQuery.eq("created_by", user.id);

  const { data: project } = await projectQuery.single();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const photosFolderId = await resolveProjectFolderIdByName(projectId, "Photos", orgId, user.id);
  if (!photosFolderId) {
    return NextResponse.json({ error: "Photos folder not found" }, { status: 404 });
  }

  const namespace = resolveNamespace(orgId, user.id);
  const folderPrefix = `orgs/${namespace}/${photosFolderId}/`;

  let filesQuery = admin
    .from("slatedrop_uploads")
    .select("id, file_name, file_type, file_size, created_at")
    .eq("status", "active")
    .like("s3_key", `${folderPrefix}%`)
    .order("created_at", { ascending: false });
  filesQuery = orgId ? filesQuery.eq("org_id", orgId) : filesQuery.eq("uploaded_by", user.id);

  const { data: uploads } = await filesQuery;

  const photos = (uploads ?? []).filter((file) => IMAGE_TYPES.has((file.file_type ?? "").toLowerCase()));
  if (photos.length === 0) {
    return NextResponse.json({ error: "No photos found to include in report" }, { status: 400 });
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 46;
  const yRef = { y: 56 };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Photo Report", margin, yRef.y);
  yRef.y += 24;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Project: ${project.name}`, margin, yRef.y);
  yRef.y += 14;
  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yRef.y);
  yRef.y += 20;

  pdf.setFont("helvetica", "bold");
  pdf.text(`Total Photos: ${photos.length}`, margin, yRef.y);
  yRef.y += 18;

  pdf.setFont("helvetica", "normal");
  photos.forEach((photo, index) => {
    const created = photo.created_at ? new Date(photo.created_at).toLocaleString() : "Unknown";
    const sizeLabel = `${Math.max(0, Math.round(Number(photo.file_size ?? 0) / 1024))} KB`;
    addWrappedLine(pdf, `${index + 1}. ${photo.file_name} — ${created} — ${sizeLabel}`, yRef, pageHeight, margin);
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${safeToken(project.name) || "project"}-photo-report-${stamp}.pdf`;
  const pdfBuffer = pdf.output("arraybuffer") as ArrayBuffer;

  const artifact = await saveProjectArtifact(
    project.id,
    project.name,
    "PhotoReport",
    {
      name: filename,
      type: "application/pdf",
      size: pdfBuffer.byteLength,
      arrayBuffer: async () => pdfBuffer,
    },
    { id: user.id },
    orgId
  );

  return NextResponse.json({
    ok: true,
    fileName: filename,
    photoCount: photos.length,
    fileId: artifact.upload.id,
    artifact,
  });
}
