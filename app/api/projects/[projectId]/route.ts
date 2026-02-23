import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNamespace } from "@/lib/slatedrop/storage";
import { s3, BUCKET } from "@/lib/s3";
import { getScopedProjectForUser, resolveProjectScope } from "@/lib/projects/access";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

async function getAuthScope() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, admin, orgId: null as string | null };
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

  return { user, admin, orgId };
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const { user } = await getAuthScope();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(projectId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { project, error } = await getScopedProjectForUser(
    user.id,
    projectId,
    "id, name, description, metadata, status, created_at"
  );

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const { user } = await getAuthScope();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin, orgId } = await resolveProjectScope(user.id);

  const { project: scopedProject } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!scopedProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    status?: string;
  };

  const updates: {
    name?: string;
    description?: string | null;
    metadata?: Record<string, unknown>;
    status?: string;
  } = {};

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Project name cannot be empty" }, { status: 400 });
    }
    updates.name = trimmed;
  }

  if (typeof body.description === "string") {
    updates.description = body.description.trim() || null;
  }

  if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
    updates.metadata = body.metadata;
  }

  if (typeof body.status === "string" && body.status.trim()) {
    updates.status = body.status.trim();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
  }

  const query = admin
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select("id, name, description, metadata, status, created_at")
    .limit(1);

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }

  if (updates.name) {
    try {
      let foldersQuery = admin
        .from("project_folders")
        .select("id, folder_path")
        .eq("project_id", projectId);

      foldersQuery = orgId ? foldersQuery.eq("org_id", orgId) : foldersQuery.eq("created_by", user.id);

      const { data: folders } = await foldersQuery;
      for (const folder of folders ?? []) {
        const oldPath = folder.folder_path ?? "";
        const match = oldPath.match(/^(?:Project Sandbox|Projects)\/[^/]+\/(.+)$/i);
        if (!match) continue;
        const tail = match[1];
        await admin
          .from("project_folders")
          .update({ folder_path: `Project Sandbox/${updates.name}/${tail}` })
          .eq("id", folder.id);
      }
    } catch (renameError) {
      // Non-blocking: folder path rename failure doesn't invalidate the project update
      console.error("[api/projects/PATCH] folder rename error:", renameError);
    }
  }

  return NextResponse.json({ ok: true, project: data });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const { user } = await getAuthScope();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin, orgId } = await resolveProjectScope(user.id);

  const body = (await req.json().catch(() => ({}))) as {
    confirmText?: string;
    confirmName?: string;
  };

  if (body.confirmText !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm" }, { status: 400 });
  }

  const { project: scopedProject } = await getScopedProjectForUser(user.id, projectId, "id, name");
  const project = scopedProject as { id: string; name: string } | null;
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if ((body.confirmName ?? "").trim() !== project.name) {
    return NextResponse.json({ error: "Project name confirmation does not match" }, { status: 400 });
  }

  // --- Attempt folder & file cleanup (non-blocking for project delete) ---
  try {
    let foldersQuery = admin
      .from("project_folders")
      .select("id")
      .eq("project_id", projectId);

    foldersQuery = orgId ? foldersQuery.eq("org_id", orgId) : foldersQuery.eq("created_by", user.id);

    const { data: folders } = await foldersQuery;
    const folderIds = (folders ?? []).map((folder) => folder.id).filter(Boolean);

    if (folderIds.length > 0) {
      const namespace = resolveNamespace(orgId, user.id);

      // Build individual LIKE filters for each folder's S3 prefix
      const prefixFilters = folderIds.map((folderId) => `s3_key.like.orgs/${namespace}/${folderId}/%`);

      let filesQuery = admin
        .from("slatedrop_uploads")
        .select("id, s3_key")
        .neq("status", "deleted");

      // Supabase .or() with more than ~50 conditions can fail, batch if needed
      if (prefixFilters.length <= 50) {
        filesQuery = filesQuery.or(prefixFilters.join(","));
      }

      filesQuery = orgId ? filesQuery.eq("org_id", orgId) : filesQuery.eq("uploaded_by", user.id);

      const { data: files } = await filesQuery;

      for (const file of files ?? []) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.s3_key }));
        } catch {
          // S3 delete failure is non-critical
        }
      }

      if ((files ?? []).length > 0) {
        const fileIds = (files ?? []).map((file) => file.id);
        await admin.from("slatedrop_uploads").delete().in("id", fileIds);
      }

      await admin.from("project_folders").delete().in("id", folderIds);
    }
  } catch (cleanupError) {
    // Log but don't block project deletion if folder/file cleanup fails
    console.error("[api/projects/DELETE] folder cleanup error (non-blocking):", cleanupError);
  }

  // --- Delete project_members explicitly (belt + suspenders alongside CASCADE) ---
  try {
    await admin.from("project_members").delete().eq("project_id", projectId);
  } catch {
    // CASCADE will handle this anyway
  }

  // --- Delete rows from tables with NO ACTION FK constraints before deleting project ---
  try {
    await admin.from("unified_files").delete().eq("project_id", projectId);
  } catch (error) {
    console.error("[api/projects/DELETE] unified_files cleanup error:", error);
  }

  try {
    await admin.from("file_folders").delete().eq("project_id", projectId);
  } catch (error) {
    console.error("[api/projects/DELETE] file_folders cleanup error:", error);
  }

  const deleteProjectQuery = admin.from("projects").delete().eq("id", projectId);
  const { error } = await deleteProjectQuery;

  if (error) {
    console.error("[api/projects/DELETE] project delete failed:", error.message, error.details, error.hint);
    return NextResponse.json({ error: `Failed to delete project: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
