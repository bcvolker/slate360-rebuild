import { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ok, forbidden } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";

export const dynamic = "force-dynamic";

async function signedGet(key: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
  } catch {
    return null;
  }
}

// GET /api/content-studio/media?editProjectId=… — list a project's source clips + signed URLs.
export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    const editProjectId = req.nextUrl.searchParams.get("editProjectId");
    let query = admin
      .from("content_media_assets")
      .select("id, kind, original_filename, storage_key, proxy_key, thumbnail_key, status, duration_sec, width, height, fps, has_audio, error_text, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (editProjectId) query = query.eq("edit_project_id", editProjectId);

    const { data, error } = await query;
    if (error) return forbidden(error.message);

    const assets = await Promise.all(
      (data ?? []).map(async (a) => ({
        id: a.id,
        kind: a.kind,
        filename: a.original_filename,
        status: a.status,
        durationSec: a.duration_sec,
        width: a.width,
        height: a.height,
        fps: a.fps,
        hasAudio: a.has_audio,
        errorText: a.error_text,
        createdAt: a.created_at,
        thumbnailUrl: await signedGet(a.thumbnail_key),
        proxyUrl: await signedGet(a.proxy_key ?? a.storage_key),
      })),
    );

    return ok({ assets });
  });
