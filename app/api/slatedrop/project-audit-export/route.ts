import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNamespace } from "@/lib/slatedrop/storage";
import { s3, BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// @ts-ignore — jszip types may lag
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = (await req.json()) as { projectId?: string };
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const admin = createAdminClient();

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

  let projectName = projectId;
  try {
    let projectQuery = admin.from("projects").select("name").eq("id", projectId).limit(1);
    projectQuery = orgId ? projectQuery.eq("org_id", orgId) : projectQuery.eq("created_by", user.id);
    const { data } = await projectQuery.single();
    if (data?.name) projectName = data.name;
  } catch {
    // fallback to id
  }

  let foldersQuery = admin
    .from("project_folders")
    .select("id, name, folder_path")
    .eq("parent_id", projectId)
    .order("name", { ascending: true });

  foldersQuery = orgId ? foldersQuery.eq("org_id", orgId) : foldersQuery.eq("created_by", user.id);

  const { data: folders, error: foldersError } = await foldersQuery;
  if (foldersError) {
    return NextResponse.json({ error: foldersError.message }, { status: 500 });
  }

  if (!folders || folders.length === 0) {
    return NextResponse.json({ error: "No project folders found" }, { status: 404 });
  }

  const zip = new JSZip();
  const bucket = BUCKET!;

  const manifest: {
    projectId: string;
    projectName: string;
    generatedAt: string;
    totalFolders: number;
    totalFiles: number;
    folders: Array<{ id: string; name: string; path: string; files: Array<{ id: string; name: string; size: number }> }>;
  } = {
    projectId,
    projectName,
    generatedAt: new Date().toISOString(),
    totalFolders: folders.length,
    totalFiles: 0,
    folders: [],
  };

  for (const folder of folders) {
    const folderPrefix = `orgs/${namespace}/${folder.id}/`;

    let filesQuery = admin
      .from("slatedrop_uploads")
      .select("id, file_name, file_size, s3_key")
      .eq("status", "active")
      .like("s3_key", `${folderPrefix}%`)
      .order("file_name", { ascending: true });

    filesQuery = orgId ? filesQuery.eq("org_id", orgId) : filesQuery.eq("uploaded_by", user.id);

    const { data: files } = await filesQuery;

    const relativeFolder = (folder.folder_path ?? folder.name)
      .replace(/^Projects\//i, "")
      .replace(`${projectName}/`, "");

    const manifestFolder = {
      id: folder.id,
      name: folder.name,
      path: relativeFolder || folder.name,
      files: [] as Array<{ id: string; name: string; size: number }>,
    };

    for (const file of files ?? []) {
      try {
        const cmd = new GetObjectCommand({ Bucket: bucket, Key: file.s3_key });
        const signed = await getSignedUrl(s3, cmd, { expiresIn: 300 });
        const res = await fetch(signed);
        if (!res.ok) continue;
        const body = await res.arrayBuffer();

        const targetPath = `${manifestFolder.path}/${file.file_name}`;
        zip.file(targetPath, body);

        manifest.totalFiles += 1;
        manifestFolder.files.push({
          id: file.id,
          name: file.file_name,
          size: Number(file.file_size ?? 0),
        });
      } catch (error) {
        console.warn("[project-audit-export] skipped file", file.file_name, error);
      }
    }

    manifest.folders.push(manifestFolder);
  }

  if (manifest.totalFiles === 0) {
    return NextResponse.json({ error: "No files found in project folders" }, { status: 404 });
  }

  zip.file("AUDIT_MANIFEST.json", JSON.stringify(manifest, null, 2));

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const uint8 = new Uint8Array(zipBuffer);

  const safeProjectName = projectName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "project";
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(uint8, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeProjectName}-audit-package-${stamp}.zip"`,
      "Content-Length": String(uint8.length),
    },
  });
}
