import "server-only";

import { loadTwinSpaceViewerData } from "./load-space-viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCameraPath, type TwinCameraPath } from "./camera-path-types";

export type TwinCinematicEditorData = {
  spaceId: string;
  spaceTitle: string;
  modelId: string;
  modelTitle: string;
  modelUrl: string;
  cameraPath: TwinCameraPath;
};

export async function loadCinematicEditorData(
  spaceId: string,
  orgId: string | null,
): Promise<TwinCinematicEditorData | null> {
  const viewer = await loadTwinSpaceViewerData(spaceId, orgId);
  if (!viewer || viewer.viewerKind !== "splat") return null;

  const admin = createAdminClient();
  const { data: model } = await admin
    .from("digital_twin_models")
    .select("camera_path")
    .eq("id", viewer.modelId)
    .eq("org_id", orgId!)
    .maybeSingle();

  return {
    spaceId: viewer.spaceId,
    spaceTitle: viewer.spaceTitle,
    modelId: viewer.modelId,
    modelTitle: viewer.modelTitle,
    modelUrl: viewer.modelUrl,
    cameraPath: parseCameraPath(model?.camera_path),
  };
}
