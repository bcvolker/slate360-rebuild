import { notFound } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  TwinCaptureSubmitScreen,
  type TwinSubmitAsset,
} from "@/components/digital-twin/TwinCaptureSubmitScreen";

export const dynamic = "force-dynamic";

/**
 * Native capture lands here after its files are collected. The same Review & Sources screen
 * is used for this server-backed capture and for the browser capture handoff.
 */
export default async function TwinCaptureSubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ captureId?: string }>;
}) {
  const { captureId } = await searchParams;
  if (!captureId) notFound();

  const context = await resolveServerOrgContext();
  if (!context.orgId) notFound();

  const admin = createAdminClient();

  const { data: capture } = await admin
    .from("digital_twin_captures")
    .select("id, capture_status, space_id, project_id, title, created_at")
    .eq("id", captureId)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (!capture) notFound();

  const { data: assetRows } = await admin
    .from("digital_twin_capture_assets")
    .select("id, storage_key, asset_kind, file_size_bytes, status, content_type")
    .eq("capture_id", capture.id)
    .eq("org_id", context.orgId);

  const assets: TwinSubmitAsset[] = (assetRows ?? []).map((row) => ({
    id: row.id,
    name: row.storage_key?.split("/").pop() ?? `${row.asset_kind} source`,
    assetKind: row.asset_kind,
    fileSizeBytes: row.file_size_bytes ?? 0,
    status: row.status ?? "uploading",
    contentType: row.content_type ?? null,
  }));

  return (
    <TwinCaptureSubmitScreen
      captureId={capture.id}
      spaceId={capture.space_id}
      projectId={capture.project_id}
      captureStatus={capture.capture_status ?? "uploaded"}
      title={capture.title ?? "Quick scan"}
      assets={assets}
    />
  );
}
