import { createAdminClient } from "@/lib/supabase/admin";
import { TokenStatePage } from "@/components/external-portal";
import UploadPortalClient from "./upload-portal-client";

export const dynamic = "force-dynamic";

export default async function UploadTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: linkRow } = await admin
    .from("project_external_links")
    .select("project_id, folder_id, expires_at, projects(name)")
    .eq("token", token)
    .maybeSingle();

  if (!linkRow) {
    return <TokenStatePage state="invalid" badge="File upload" />;
  }

  if (linkRow.expires_at && new Date(linkRow.expires_at).getTime() < Date.now()) {
    return (
      <TokenStatePage
        state="expired"
        badge="File upload"
        description="This upload portal is no longer active. Please request a new link from the project team."
      />
    );
  }

  const projectName =
    linkRow.projects && typeof linkRow.projects === "object" && "name" in linkRow.projects
      ? String((linkRow.projects as { name?: string }).name ?? "Project")
      : "Project";

  return (
    <UploadPortalClient
      token={token}
      folderId={linkRow.folder_id}
      projectName={projectName}
    />
  );
}
