import "server-only";

import { loadTwinSpaceViewerData } from "./load-space-viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseEditList, type TwinEditList } from "./edit-list-types";

export type TwinDesktopEditorData = {
  spaceId: string;
  spaceTitle: string;
  modelId: string;
  modelTitle: string;
  modelUrl: string;
  editList: TwinEditList;
};

export async function loadDesktopEditorData(
  spaceId: string,
  orgId: string | null,
): Promise<TwinDesktopEditorData | null> {
  const viewer = await loadTwinSpaceViewerData(spaceId, orgId);
  if (!viewer || viewer.viewerKind !== "splat") return null;

  const admin = createAdminClient();
  const { data: model } = await admin
    .from("digital_twin_models")
    .select("edit_list")
    .eq("id", viewer.modelId)
    .eq("org_id", orgId!)
    .maybeSingle();

  return {
    spaceId: viewer.spaceId,
    spaceTitle: viewer.spaceTitle,
    modelId: viewer.modelId,
    modelTitle: viewer.modelTitle,
    modelUrl: viewer.modelUrl,
    editList: parseEditList(model?.edit_list),
  };
}
