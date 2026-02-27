import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { s3, BUCKET } from "@/lib/s3";
import { buildCanonicalS3Key, resolveNamespace } from "@/lib/slatedrop/storage";

type Params = { projectId: string };

async function authorize(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { project } = await getScopedProjectForUser(user.id, projectId, "id,name");
  if (!project) return { user: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { user, project, error: null };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  const { error } = await authorize(projectId);
  if (error) return error;
  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("project_contracts")
    .select("id, title, contract_type, parties, executed_date, contract_value, status, summary, key_requirements, file_url, file_upload_id, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ contracts: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  const { user, error } = await authorize(projectId);
  if (error || !user) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const formData = await req.formData();
  const title         = String(formData.get("title") ?? "");
  const contractType  = String(formData.get("contract_type") ?? "");
  const parties       = String(formData.get("parties") ?? "");
  const executedDate  = formData.get("executed_date") ? String(formData.get("executed_date")) : null;
  const contractValue = formData.get("contract_value") ? Number(formData.get("contract_value")) : null;
  const status        = String(formData.get("status") ?? "Draft");
  const file          = formData.get("file") as File | null;

  let fileUrl: string | null = null;
  let fileUploadId: string | null = null;

  const admin = createAdminClient();

  if (file && file.size > 0) {
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    const allowedMime = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]);
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Contract file exceeds 25MB limit" }, { status: 400 });
    }
    if (file.type && !allowedMime.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Use PDF, DOC, DOCX, or TXT." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._\-() ]/g, "_");

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

    const namespace = resolveNamespace(orgId, user.id);

    const { data: contractFolder } = await admin
      .from("project_folders")
      .select("id")
      .eq("project_id", projectId)
      .eq("name", "Submittals")
      .limit(1)
      .maybeSingle();

    const s3Key = contractFolder?.id
      ? buildCanonicalS3Key(namespace, contractFolder.id, safeFileName)
      : `projects/${projectId}/contracts/${Date.now()}_${safeFileName}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type || "application/octet-stream",
    }));

    const ext = safeFileName.split(".").pop()?.toLowerCase() ?? "";
    const { data: uploadRow, error: uploadErr } = await admin
      .from("slatedrop_uploads")
      .insert({
        file_name: safeFileName,
        file_size: file.size,
        file_type: ext,
        s3_key: s3Key,
        folder_id: contractFolder?.id ?? null,
        org_id: orgId,
        uploaded_by: user.id,
        status: "active",
      })
      .select("id")
      .single();

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    fileUploadId = uploadRow.id;
    if (fileUploadId) {
      fileUrl = `/api/slatedrop/download?fileId=${encodeURIComponent(fileUploadId)}`;
    }
  }

  const { data, error: dbErr } = await admin
    .from("project_contracts")
    .insert({
      project_id:     projectId,
      title,
      contract_type:  contractType || null,
      parties:        parties      || null,
      executed_date:  executedDate,
      contract_value: contractValue,
      status,
      file_url:       fileUrl,
      file_upload_id: fileUploadId,
    })
    .select()
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ contract: data }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  const { error } = await authorize(projectId);
  if (error) return error;
  const body = await req.json() as Record<string, unknown>;
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("project_contracts")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", String(id))
    .eq("project_id", projectId)
    .select()
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ contract: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  const { error } = await authorize(projectId);
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = createAdminClient();
  const { error: dbErr } = await admin
    .from("project_contracts")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
