/**
 * /share/[token] — Public file viewer for shared SlateDrop files.
 * Validates the token against `slate_drop_links`, generates a
 * time-limited presigned S3 URL, and renders the file inline.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import { TokenStatePage } from "@/components/external-portal";
import ShareViewer from "./ShareViewer";
import ShareGate from "./ShareGate";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;
  if (!token || token.length < 10) {
    return <TokenStatePage state="invalid" badge="Shared file" />;
  }

  const admin = createAdminClient();

  const { data: link, error } = await admin
    .from("slate_drop_links")
    .select("id, file_id, role, expires_at, created_by")
    .eq("token", token)
    .single();

  if (error || !link) {
    return <TokenStatePage state="invalid" badge="Shared file" />;
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return (
      <TokenStatePage
        state="expired"
        badge="Shared file"
        description="This share link has expired. Please request a new one from the sender."
      />
    );
  }

  // Password gate — read defensively so existing links keep working even before
  // the password_hash column migration is applied.
  let passwordHash: string | null = null;
  try {
    const { data: pwRow } = await admin
      .from("slate_drop_links")
      .select("password_hash")
      .eq("token", token)
      .maybeSingle();
    passwordHash = (pwRow as { password_hash?: string | null } | null)?.password_hash ?? null;
  } catch {
    passwordHash = null;
  }

  if (passwordHash) {
    // Don't presign here — the recipient must unlock first via the unlock route.
    return <ShareGate token={token} badge="Shared file" />;
  }

  const { data: unifiedFile, error: unifiedFileError } = await admin
    .from("unified_files")
    .select("id, name, mime_type, size_bytes, storage_key, status")
    .eq("id", link.file_id)
    .maybeSingle();

  const { data: legacyFile, error: legacyFileError } = unifiedFile
    ? { data: null, error: null }
    : await admin
        .from("slatedrop_uploads")
        .select("id, file_name, file_type, file_size, s3_key")
        .eq("id", link.file_id)
        .neq("status", "deleted")
        .maybeSingle();

  const file = unifiedFile
    ? {
        fileName: unifiedFile.name,
        fileType: unifiedFile.mime_type ?? "",
        fileSize: unifiedFile.size_bytes,
        storageKey: unifiedFile.storage_key,
        status: unifiedFile.status ?? "ready",
      }
    : legacyFile
      ? {
          fileName: legacyFile.file_name,
          fileType: legacyFile.file_type ?? "",
          fileSize: legacyFile.file_size,
          storageKey: legacyFile.s3_key,
          status: "ready",
        }
      : null;

  if (unifiedFileError || legacyFileError || !file || !file.storageKey || file.status === "archived") {
    return (
      <TokenStatePage
        state="unavailable"
        badge="Shared file"
        description="The shared file is no longer available. It may have been removed or archived."
      />
    );
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: file.storageKey });
  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  const canDownload = link.role === "download";
  const fileType = file.fileType.toLowerCase();

  return (
    <ShareViewer
      fileName={file.fileName}
      fileType={fileType}
      fileSize={file.fileSize}
      presignedUrl={presignedUrl}
      canDownload={canDownload}
    />
  );
}
