import { notFound } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/server/beta-access";
import {
  TwinCaptureSubmitScreen,
  type TwinSubmitAsset,
} from "@/components/digital-twin/TwinCaptureSubmitScreen";

export const dynamic = "force-dynamic";

/**
 * Post-capture submit funnel. The native iOS LiDAR path uploads the capture inside the
 * plugin, then navigates the WebView here with ?captureId=… — landing the user on a clear
 * "scan ready → cost → process → status → view" screen instead of the generic upload page.
 * Loads the capture + its assets server-side (by id) so it survives a fresh WebView load
 * with no in-memory web state.
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
    .select("asset_kind, file_size_bytes, status, content_type")
    .eq("capture_id", capture.id)
    .eq("org_id", context.orgId);

  const assets: TwinSubmitAsset[] = (assetRows ?? []).map((row) => ({
    assetKind: row.asset_kind,
    fileSizeBytes: row.file_size_bytes ?? 0,
    status: row.status ?? "uploading",
    contentType: row.content_type ?? null,
  }));

  let canUseHighQuality = isOwnerEmail(context.user?.email);
  if (!canUseHighQuality && context.orgId) {
    const { data } = await admin
      .from("org_app_subscriptions")
      .select("digital_twin")
      .eq("org_id", context.orgId)
      .maybeSingle();
    canUseHighQuality = data?.digital_twin === "pro";
  }

  return (
    <TwinCaptureSubmitScreen
      captureId={capture.id}
      spaceId={capture.space_id}
      captureStatus={capture.capture_status ?? "uploaded"}
      title={capture.title ?? "Quick scan"}
      createdAt={capture.created_at}
      assets={assets}
      canUseHighQuality={canUseHighQuality}
    />
  );
}
