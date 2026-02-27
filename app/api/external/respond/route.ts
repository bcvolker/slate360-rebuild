import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveProjectArtifact } from "@/lib/slatedrop/projectArtifacts";

type ExternalLinkRow = {
  id: string;
  project_id: string;
  target_type: "RFI" | "Submittal" | "Document";
  target_id: string;
  token: string;
  expires_at: string | null;
  is_active: boolean;
};

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: link, error: linkError } = await admin
    .from("project_external_links")
    .select("id, project_id, target_type, target_id, token, expires_at, is_active")
    .eq("token", token)
    .maybeSingle();

  if (linkError || !link) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const typedLink = link as ExternalLinkRow;
  const now = Date.now();
  const expired = typedLink.expires_at ? new Date(typedLink.expires_at).getTime() < now : false;
  if (!typedLink.is_active || expired) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  const { data: project } = await admin
    .from("projects")
    .select("id, name")
    .eq("id", typedLink.project_id)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  if (typedLink.target_type === "RFI") {
    const { data: rfi } = await admin
      .from("project_rfis")
      .select("id, subject, question, status")
      .eq("id", typedLink.target_id)
      .maybeSingle();

    if (!rfi) return NextResponse.json({ error: "RFI not found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      item: {
        type: "RFI",
        id: rfi.id,
        title: rfi.subject,
        body: rfi.question,
        status: rfi.status,
      },
      project,
    });
  }

  const { data: submittal } = await admin
    .from("project_submittals")
    .select("id, title, spec_section, status, document_type, document_code, stakeholder_email, amount, version_number, sent_at, last_response_at, response_decision")
    .eq("id", typedLink.target_id)
    .maybeSingle();

  if (!submittal) return NextResponse.json({ error: "Submittal not found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    item: {
      type: typedLink.target_type,
      id: submittal.id,
      title: submittal.title,
      body: submittal.spec_section || "No spec section provided",
      status: submittal.status,
      metadata: {
        document_type: submittal.document_type,
        document_code: submittal.document_code,
        stakeholder_email: submittal.stakeholder_email,
        amount: submittal.amount,
        version_number: submittal.version_number,
        sent_at: submittal.sent_at,
        last_response_at: submittal.last_response_at,
        response_decision: submittal.response_decision,
      },
    },
    project,
  });
}

export async function POST(req: NextRequest) {
  const admin = createAdminClient();
  const formData = await req.formData();

  const token = String(formData.get("token") ?? "").trim();
  const responseText = String(formData.get("response_text") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const upload = formData.get("file");

  if (!token || !responseText) {
    return NextResponse.json({ error: "token and response_text are required" }, { status: 400 });
  }

  const { data: link, error: linkError } = await admin
    .from("project_external_links")
    .select("id, project_id, target_type, target_id, token, expires_at, is_active")
    .eq("token", token)
    .maybeSingle();

  if (linkError || !link) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const typedLink = link as ExternalLinkRow;
  const now = Date.now();
  const expired = typedLink.expires_at ? new Date(typedLink.expires_at).getTime() < now : false;
  if (!typedLink.is_active || expired) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, name, created_by, org_id")
    .eq("id", typedLink.project_id)
    .single();

  if (projectError || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const decisionLabel = decision || "comment";

  if (typedLink.target_type === "RFI") {
    const nextStatus = decisionLabel === "approve" ? "Answered" : decisionLabel === "reject" ? "In Review" : "Answered";
    const { error } = await admin
      .from("project_rfis")
      .update({ status: nextStatus, response_text: `[${decisionLabel}] ${responseText}` })
      .eq("id", typedLink.target_id)
      .eq("project_id", typedLink.project_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const nextStatus = decisionLabel === "approve"
      ? "Approved"
      : decisionLabel === "reject"
        ? "Rejected"
        : "In Review";

    const { error } = await admin
      .from("project_submittals")
      .update({
        status: nextStatus,
        response_text: responseText,
        response_decision: decisionLabel,
        last_response_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", typedLink.target_id)
      .eq("project_id", typedLink.project_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
   }

  let artifact: unknown = null;
  if (upload instanceof File && upload.size > 0) {
    const kind = typedLink.target_type === "RFI" ? "RFI" : "Submittal";
    artifact = await saveProjectArtifact(
      project.id,
      project.name,
      kind,
      {
        name: upload.name,
        type: upload.type,
        size: upload.size,
        arrayBuffer: () => upload.arrayBuffer(),
      },
      { id: project.created_by },
      project.org_id
    );
  }

  const { error: notifyError } = await admin.from("project_notifications").insert({
    user_id: project.created_by,
    project_id: project.id,
    title: `${typedLink.target_type} response received`,
    message: `External stakeholder submitted a ${decisionLabel} response for ${typedLink.target_type}.`,
    link_path: typedLink.target_type === "RFI"
      ? `/project-hub/${project.id}/rfis`
      : `/project-hub/${project.id}/submittals`,
    is_read: false,
  });

  if (notifyError) {
    return NextResponse.json({ error: notifyError.message }, { status: 500 });
  }

  await admin
    .from("project_external_links")
    .update({ is_active: false })
    .eq("id", typedLink.id);

  return NextResponse.json({ ok: true, artifact });
}
