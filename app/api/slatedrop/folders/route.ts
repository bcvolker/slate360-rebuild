import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { getScopedProjectForUser, resolveProjectScope } from "@/lib/projects/access";
import { resolveNamespace } from "@/lib/slatedrop/storage";
import { s3, BUCKET } from "@/lib/s3";

type FolderRow = {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  folder_path: string | null;
  is_system: boolean | null;
  org_id: string | null;
  created_by: string | null;
};

function sanitizeSegment(name: string): string {
  return name
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function buildFolderTreeIds(rows: FolderRow[], rootId: string): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parent_id) continue;
    const arr = childrenByParent.get(row.parent_id) ?? [];
    arr.push(row.id);
    childrenByParent.set(row.parent_id, arr);
  }

  const output: string[] = [];
  const stack: string[] = [rootId];

  while (stack.length > 0) {
    const currentId = stack.pop() as string;
    output.push(currentId);
    const children = childrenByParent.get(currentId) ?? [];
    for (const child of children) {
      stack.push(child);
    }
  }

  return output;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const { admin, orgId } = await resolveProjectScope(user.id);

  let query = admin
    .from("project_folders")
    .select("id, name, project_id, folder_path")
    .order("name", { ascending: true })
    .limit(200);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  query = orgId ? query.eq("org_id", orgId) : query.eq("created_by", user.id);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const folders = (data ?? []).map((folder) => ({
    id: folder.id,
    name: folder.name,
    project_id: folder.project_id,
    folder_path: folder.folder_path,
    file_count: 0,
  }));

  return NextResponse.json({ folders });
}

export async function HEAD(req: NextRequest) {
  const response = await GET(req);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET,HEAD,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    projectId?: string;
    parentFolderId?: string | null;
    name?: string;
  };

  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const parentFolderId = typeof body.parentFolderId === "string" ? body.parentFolderId : null;
  const name = sanitizeSegment(body.name ?? "");

  if (!projectId || !name) {
    return NextResponse.json({ error: "projectId and name are required" }, { status: 400 });
  }

  const { admin, orgId } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id, name, org_id, created_by");
  const scopedProject = project as { id: string; name: string; org_id: string | null; created_by: string | null } | null;

  if (!scopedProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let parentFolder: FolderRow | null = null;
  if (parentFolderId) {
    const { data } = await admin
      .from("project_folders")
      .select("id, project_id, parent_id, name, folder_path, is_system, org_id, created_by")
      .eq("id", parentFolderId)
      .eq("project_id", projectId)
      .maybeSingle();

    parentFolder = (data as FolderRow | null) ?? null;
    if (!parentFolder) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    }
  }

  const basePath = parentFolder?.folder_path ?? `Project Sandbox/${scopedProject.name}`;
  const folderPath = `${basePath}/${name}`;

  const insertRow = {
    project_id: projectId,
    parent_id: parentFolder?.id ?? null,
    name,
    folder_path: folderPath,
    is_system: false,
    folder_type: "custom",
    scope: "project",
    is_public: false,
    allow_upload: true,
    allow_download: true,
    org_id: scopedProject.org_id ?? orgId,
    created_by: scopedProject.created_by ?? user.id,
  };

  const { data: created, error } = await admin
    .from("project_folders")
    .insert(insertRow)
    .select("id, name, folder_path, project_id, parent_id, is_system")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? "Failed to create folder" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, folder: created });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    folderId?: string;
    newName?: string;
  };

  const folderId = typeof body.folderId === "string" ? body.folderId : "";
  const newName = sanitizeSegment(body.newName ?? "");

  if (!folderId || !newName) {
    return NextResponse.json({ error: "folderId and newName are required" }, { status: 400 });
  }

  const { admin, orgId } = await resolveProjectScope(user.id);

  let folderQuery = admin
    .from("project_folders")
    .select("id, project_id, parent_id, name, folder_path, is_system, org_id, created_by")
    .eq("id", folderId)
    .limit(1);

  folderQuery = orgId ? folderQuery.eq("org_id", orgId) : folderQuery.eq("created_by", user.id);

  const { data: folderData } = await folderQuery.single();
  const folder = (folderData as FolderRow | null) ?? null;

  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  if (folder.is_system) return NextResponse.json({ error: "System folders cannot be renamed" }, { status: 400 });

  const { project } = await getScopedProjectForUser(user.id, folder.project_id, "id, name");
  const scopedProject = project as { id: string; name: string } | null;
  if (!scopedProject) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  let parentPath = `Project Sandbox/${scopedProject.name}`;
  if (folder.parent_id) {
    const { data: parentFolder } = await admin
      .from("project_folders")
      .select("folder_path")
      .eq("id", folder.parent_id)
      .eq("project_id", folder.project_id)
      .maybeSingle();

    if (parentFolder?.folder_path) {
      parentPath = parentFolder.folder_path;
    }
  }

  const oldPath = folder.folder_path ?? `${parentPath}/${folder.name}`;
  const newPath = `${parentPath}/${newName}`;

  const { error: updateError } = await admin
    .from("project_folders")
    .update({ name: newName, folder_path: newPath })
    .eq("id", folder.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: descendants } = await admin
    .from("project_folders")
    .select("id, folder_path")
    .eq("project_id", folder.project_id)
    .like("folder_path", `${oldPath}/%`);

  for (const child of descendants ?? []) {
    const childPath = child.folder_path ?? "";
    const nextChildPath = childPath.replace(oldPath, newPath);
    await admin.from("project_folders").update({ folder_path: nextChildPath }).eq("id", child.id);
  }

  return NextResponse.json({ ok: true, folderId: folder.id, name: newName, folderPath: newPath });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    folderId?: string;
  };

  const folderId = typeof body.folderId === "string" ? body.folderId : "";
  if (!folderId) return NextResponse.json({ error: "folderId is required" }, { status: 400 });

  const { admin, orgId } = await resolveProjectScope(user.id);

  let folderQuery = admin
    .from("project_folders")
    .select("id, project_id, parent_id, name, folder_path, is_system, org_id, created_by")
    .eq("id", folderId)
    .limit(1);

  folderQuery = orgId ? folderQuery.eq("org_id", orgId) : folderQuery.eq("created_by", user.id);
  const { data: folderData } = await folderQuery.single();
  const folder = (folderData as FolderRow | null) ?? null;

  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  if (folder.is_system) return NextResponse.json({ error: "System folders cannot be deleted" }, { status: 400 });

  const { data: allProjectFolders } = await admin
    .from("project_folders")
    .select("id, project_id, parent_id, name, folder_path, is_system, org_id, created_by")
    .eq("project_id", folder.project_id);

  const rows = (allProjectFolders ?? []) as FolderRow[];
  const folderIds = buildFolderTreeIds(rows, folder.id);

  const namespace = resolveNamespace(orgId, user.id);
  const prefixFilters = folderIds.map((id) => `s3_key.like.orgs/${namespace}/${id}/%`);

  let filesQuery = admin.from("slatedrop_uploads").select("id, s3_key").neq("status", "deleted");
  if (prefixFilters.length > 0 && prefixFilters.length <= 50) {
    filesQuery = filesQuery.or(prefixFilters.join(","));
  }
  filesQuery = orgId ? filesQuery.eq("org_id", orgId) : filesQuery.eq("uploaded_by", user.id);

  const { data: files } = await filesQuery;

  for (const file of files ?? []) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.s3_key }));
    } catch {
      // best effort
    }
  }

  if ((files ?? []).length > 0) {
    const fileIds = (files ?? []).map((file) => file.id);
    await admin.from("slatedrop_uploads").update({ status: "deleted" }).in("id", fileIds);
  }

  const { error: deleteError } = await admin.from("project_folders").delete().in("id", folderIds);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deletedFolderIds: folderIds });
}
