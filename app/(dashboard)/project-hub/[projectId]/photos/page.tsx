import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNamespace } from "@/lib/slatedrop/storage";
import PhotoLogClient from "@/components/project-hub/PhotoLogClient";
import { resolveProjectFolderIdByName } from "@/lib/slatedrop/projectArtifacts";
import { getScopedProjectForUser } from "@/lib/projects/access";

type UploadRow = {
  id: string;
  file_name: string;
  file_type: string | null;
  created_at?: string | null;
};

const IMAGE_TYPES = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "heic", "bmp"]);

export default async function PhotosPage({
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
    redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}/photos`)}`);
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

  let photosFolderId: string | null = null;
  try {
    photosFolderId = await resolveProjectFolderIdByName(projectId, "Photos", orgId, user.id);
  } catch {
    photosFolderId = null;
  }

  if (!photosFolderId) {
    return <PhotoLogClient files={[]} />;
  }

  const namespace = resolveNamespace(orgId, user.id);
  const folderPrefix = `orgs/${namespace}/${photosFolderId}/`;

  let query = admin
    .from("slatedrop_uploads")
    .select("id, file_name, file_type, created_at")
    .eq("status", "active")
    .like("s3_key", `${folderPrefix}%`)
    .order("created_at", { ascending: false });

  query = orgId ? query.eq("org_id", orgId) : query.eq("uploaded_by", user.id);

  const { data: uploads } = await query;

  const photos = ((uploads ?? []) as UploadRow[])
    .filter((file) => IMAGE_TYPES.has((file.file_type ?? "").toLowerCase()))
    .map((file) => ({
      id: file.id,
      name: file.file_name,
      createdAt: file.created_at ?? null,
    }));

  return <PhotoLogClient files={photos} />;
}
