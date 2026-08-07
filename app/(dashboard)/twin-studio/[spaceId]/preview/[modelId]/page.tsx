import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { VersionPreview } from "@/components/twin-studio/VersionPreview";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { resolveDigitalTwinModelUrl } from "@/lib/digital-twin/resolve-model-url";

type PageProps = { params: Promise<{ spaceId: string; modelId: string }> };

/**
 * D-gap fix — non-destructive preview of any ready model version (the R7.5
 * visual gate previously required publishing a version just to look at it).
 * Access gating is the twin-studio layout's canAccessTwinDesktop check; this
 * page only verifies the model actually belongs to this org + space.
 */
export default async function TwinStudioVersionPreviewPage({ params }: PageProps) {
  const { spaceId, modelId } = await params;
  const { orgId } = await resolveServerOrgContext();
  if (!orgId) notFound();

  const admin = createAdminClient();
  const { data: model } = await admin
    .from("digital_twin_models")
    .select("id, title, created_at, quality_metrics, is_primary, space_id, model_format, storage_key")
    .eq("id", modelId)
    .eq("org_id", orgId)
    .eq("space_id", spaceId)
    .eq("status", "ready")
    .is("deleted_at", null)
    .maybeSingle();
  if (!model?.storage_key) notFound();

  // Format-aware URL, mirroring loadTwinSpaceViewerData: splats/lidar stream
  // via same-origin org-scoped routes; GLB/pano get a presigned URL. The first
  // Preview hardcoded the splat stream, so GLB/Potree versions never loaded.
  const viewerKind = resolveTwinViewerKind(model.model_format, model.storage_key);
  const modelUrl =
    viewerKind === "splat"
      ? `/api/digital-twin/models/${model.id}/splat`
      : viewerKind === "lidar"
        ? `/api/digital-twin/models/${model.id}/lidar/hierarchy.json`
        : await resolveDigitalTwinModelUrl(model.storage_key);

  const { data: space } = await admin
    .from("digital_twin_spaces")
    .select("published_model_id")
    .eq("id", spaceId)
    .eq("org_id", orgId)
    .maybeSingle();

  const qm = (model.quality_metrics ?? {}) as { trainPsnr?: number };
  const created = new Date(model.created_at);
  const label = Number.isNaN(created.getTime())
    ? model.title
    : created.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const isPublished = space?.published_model_id
    ? space.published_model_id === model.id
    : Boolean(model.is_primary);

  return (
    <div className="h-full min-h-0">
      <VersionPreview
        spaceId={spaceId}
        modelId={model.id}
        label={label}
        psnr={typeof qm.trainPsnr === "number" ? qm.trainPsnr : null}
        isPublished={isPublished}
        viewerKind={viewerKind}
        modelUrl={modelUrl}
        modelTitle={model.title ?? label}
      />
    </div>
  );
}
