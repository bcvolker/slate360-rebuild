import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDigitalTwinModelUrl } from "@/lib/digital-twin/resolve-model-url";
import {
  claimTwinShareView,
  resolveTwinShareToken,
  twinShareDenyToPortalState,
} from "@/lib/digital-twin/share-token";
import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { TwinShareViewer } from "@/components/digital-twin/TwinShareViewer";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ embed?: string }>;
};

export default async function SharedTwinPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { embed: embedParam } = await searchParams;
  const embed = embedParam === "1";

  const gate = await resolveTwinShareToken(token);
  if (!gate.ok) {
    return (
      <TwinShareViewer
        embed={embed}
        title=""
        modelUrl=""
        modelTitle=""
        viewerKind="unsupported"
        tokenState={twinShareDenyToPortalState(gate.reason)}
      />
    );
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = hdrs.get("user-agent") ?? "unknown";

  const claimed = await claimTwinShareView(token, ip, ua);
  if (!claimed) {
    return (
      <TwinShareViewer
        embed={embed}
        title=""
        modelUrl=""
        modelTitle=""
        viewerKind="unsupported"
        tokenState="unavailable"
      />
    );
  }

  const admin = createAdminClient();

  const { data: space } = await admin
    .from("digital_twin_spaces")
    .select("id, title, published_model_id")
    .eq("id", claimed.space_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!space) {
    return (
      <TwinShareViewer
        embed={embed}
        title=""
        modelUrl=""
        modelTitle=""
        viewerKind="unsupported"
        tokenState="unavailable"
      />
    );
  }

  let modelQuery = admin
    .from("digital_twin_models")
    .select("id, title, model_format, storage_key, status, is_primary, quality_metrics, georef")
    .eq("space_id", space.id)
    .eq("org_id", claimed.org_id)
    .eq("status", "ready")
    .is("deleted_at", null);

  if (space.published_model_id) {
    modelQuery = modelQuery.eq("id", space.published_model_id);
  } else {
    modelQuery = modelQuery.eq("is_primary", true);
  }

  const { data: model } = await modelQuery.maybeSingle();
  if (!model?.storage_key) {
    return (
      <TwinShareViewer
        embed={embed}
        title={space.title}
        modelUrl=""
        modelTitle=""
        viewerKind="unsupported"
        tokenState="unavailable"
      />
    );
  }

  const viewerKind = resolveTwinViewerKind(model.model_format, model.storage_key);
  const { data: lidarSibling } =
    viewerKind === "lidar"
      ? { data: null }
      : await admin
          .from("digital_twin_models")
          .select("id")
          .eq("space_id", space.id)
          .eq("org_id", claimed.org_id)
          .eq("model_format", "lidar_potree")
          .eq("status", "ready")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
  const lidarModelId = viewerKind === "lidar" ? model.id : lidarSibling?.id ?? null;

  const [modelUrl, orgResult] = await Promise.all([
    viewerKind === "splat"
      ? Promise.resolve(`/api/share/twin/${token}/splat`)
      : viewerKind === "lidar"
        ? Promise.resolve(`/api/share/twin/${token}/lidar/hierarchy.json`)
      : resolveDigitalTwinModelUrl(model.storage_key),
    admin.from("organizations").select("name").eq("id", claimed.org_id).maybeSingle(),
  ]);

  const canAnnotate = claimed.role === "annotate";
  const canDownload = claimed.role === "download";

  return (
    <TwinShareViewer
      embed={embed}
      title={space.title}
      orgName={orgResult.data?.name ?? null}
      modelUrl={modelUrl}
      modelTitle={model.title}
      modelId={model.id}
      lidarModelId={lidarModelId}
      viewerKind={viewerKind}
      shareToken={token}
      qualityMetrics={
        model.quality_metrics as Record<string, unknown> | null | undefined
      }
      georef={model.georef as Record<string, unknown> | null | undefined}
      canAnnotate={canAnnotate}
      canDownload={canDownload}
    />
  );
}
