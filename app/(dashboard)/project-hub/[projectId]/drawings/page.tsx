import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNamespace } from "@/lib/slatedrop/storage";
import DrawingsViewerClient from "@/components/project-hub/DrawingsViewerClient";
import { resolveProjectFolderIdByName } from "@/lib/slatedrop/projectArtifacts";
import { getScopedProjectForUser } from "@/lib/projects/access";

type UploadRow = {
  id: string;
  file_name: string;
  file_type: string | null;
  created_at: string | null;
};

export default async function DrawingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}/drawings`)}`);
  }

  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const orgId = membership?.org_id ?? null;

  const { project } = await getScopedProjectForUser(user.id, projectId, "id");

  if (!project) {
    notFound();
  }

  let drawingFolderId: string | null = null;
  try {
    drawingFolderId = await resolveProjectFolderIdByName(projectId, "Drawings", orgId, user.id);
  } catch {
    drawingFolderId = null;
  }

  if (!drawingFolderId) {
    return <DrawingsViewerClient files={[]} />;
  }

  const namespace = resolveNamespace(orgId, user.id);
  const folderPrefix = `orgs/${namespace}/${drawingFolderId}/`;

  let query = admin
    .from("slatedrop_uploads")
    .select("id, file_name, file_type, created_at")
    .eq("status", "active")
    .like("s3_key", `${folderPrefix}%`)
    .order("created_at", { ascending: false });

  query = orgId ? query.eq("org_id", orgId) : query.eq("uploaded_by", user.id);

  const { data: uploads } = await query;

  const pdfFiles = ((uploads ?? []) as UploadRow[])
    .filter((file) => (file.file_type ?? "").toLowerCase() === "pdf")
    .map((file) => ({
      id: file.id,
      name: file.file_name,
      createdAt: file.created_at,
    }));

  return <DrawingsViewerClient files={pdfFiles} />;
}
