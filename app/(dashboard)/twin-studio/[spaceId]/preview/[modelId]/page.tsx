import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { VersionPreview } from "@/components/twin-studio/VersionPreview";
import { resolveServerOrgContext } from "@/lib/server/org-context";

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
    .select("id, title, created_at, quality_metrics, is_primary, space_id")
    .eq("id", modelId)
    .eq("org_id", orgId)
    .eq("space_id", spaceId)
    .eq("status", "ready")
    .is("deleted_at", null)
    .maybeSingle();
  if (!model) notFound();

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
      />
    </div>
  );
}
