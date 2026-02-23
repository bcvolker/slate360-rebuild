import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
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
    notFound();
  }

  if (linkRow.expires_at && new Date(linkRow.expires_at).getTime() < Date.now()) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-black text-gray-900">Upload Link Expired</h1>
          <p className="mt-2 text-sm text-gray-500">This upload portal is no longer active. Please request a new link.</p>
        </div>
      </div>
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
