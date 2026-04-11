/**
 * /share/[token] — Public file viewer for shared SlateDrop files.
 * Validates the token against `slate_drop_links`, generates a
 * time-limited presigned S3 URL, and renders the file inline.
 */
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import ShareViewer from "./ShareViewer";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;
  if (!token || token.length < 10) notFound();

  const admin = createAdminClient();

  // Look up the share link
  const { data: link, error } = await admin
    .from("slate_drop_links")
    .select("id, file_id, role, expires_at, created_by")
    .eq("token", token)
    .single();

  if (error || !link) notFound();

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-3 p-8">
          <h1 className="text-2xl font-black text-zinc-100">Link Expired</h1>
          <p className="text-sm text-zinc-400">This share link has expired. Please request a new one.</p>
        </div>
      </div>
    );
  }

  // Fetch file metadata
  const { data: file, error: fileErr } = await admin
    .from("slatedrop_uploads")
    .select("id, file_name, file_type, size, s3_key")
    .eq("id", link.file_id)
    .neq("status", "deleted")
    .single();

  if (fileErr || !file || !file.s3_key) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-3 p-8">
          <h1 className="text-2xl font-black text-zinc-100">File Not Found</h1>
          <p className="text-sm text-zinc-400">The shared file is no longer available.</p>
        </div>
      </div>
    );
  }

  // Generate a presigned URL (1 hour)
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: file.s3_key });
  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  const canDownload = link.role === "download";
  const fileType = (file.file_type ?? "").toLowerCase();

  return (
    <ShareViewer
      fileName={file.file_name}
      fileType={fileType}
      fileSize={file.size}
      presignedUrl={presignedUrl}
      canDownload={canDownload}
    />
  );
}
