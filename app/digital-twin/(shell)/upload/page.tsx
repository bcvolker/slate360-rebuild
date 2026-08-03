import { notFound } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { TwinReviewSourcesScreen } from "@/components/digital-twin/review-sources/TwinReviewSourcesScreen";
import type {
  TwinReviewExistingAsset,
  TwinReviewInitialCapture,
  TwinReviewTarget,
} from "@/lib/digital-twin/review-source-types";

type PageProps = {
  searchParams: Promise<{ projectId?: string; mode?: string; capture?: string }>;
};

export default async function DigitalTwinUploadPage({ searchParams }: PageProps) {
  const context = await resolveServerOrgContext();
  const params = await searchParams;
  const initialProjectId = params.projectId?.trim() || null;
  const initialCaptureId = params.capture?.trim() || null;
  const { twins, projects } = await loadDigitalTwinHubData(context.orgId);

  if (initialCaptureId && context.orgId) {
    const admin = createAdminClient();
    const { data: capture } = await admin
      .from("digital_twin_captures")
      .select("id, capture_status, space_id, project_id, title")
      .eq("id", initialCaptureId)
      .eq("org_id", context.orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!capture) notFound();

    const { data: assetRows } = await admin
      .from("digital_twin_capture_assets")
      .select("id, storage_key, asset_kind, file_size_bytes, status, content_type")
      .eq("capture_id", capture.id)
      .eq("org_id", context.orgId)
      .is("deleted_at", null);
    const assets: TwinReviewExistingAsset[] = (assetRows ?? []).map((asset) => ({
      id: asset.id,
      name: asset.storage_key?.split("/").pop() ?? `${asset.asset_kind} source`,
      sizeBytes: asset.file_size_bytes ?? 0,
      status: asset.status ?? "pending",
      contentType: asset.content_type ?? "",
      assetKind: asset.asset_kind,
    }));
    const initialCapture: TwinReviewInitialCapture = {
      captureId: capture.id,
      spaceId: capture.space_id,
      projectId: capture.project_id ?? "",
      title: capture.title ?? "Quick scan",
      captureStatus: capture.capture_status ?? "uploaded",
      assets,
    };
    return <TwinReviewSourcesScreen allowPendingSession={false} initialCapture={initialCapture} />;
  }

  const space = initialProjectId
    ? twins.find((twin) => twin.projectId === initialProjectId) ?? null
    : twins[0] ?? null;
  const target: TwinReviewTarget | undefined =
    space?.id && (initialProjectId ?? space.projectId ?? projects[0]?.id)
      ? {
          spaceId: space.id,
          projectId: initialProjectId ?? space.projectId ?? projects[0]!.id,
          title: space.title,
        }
      : undefined;

  return <TwinReviewSourcesScreen allowPendingSession={false} initialTarget={target} />;
}
