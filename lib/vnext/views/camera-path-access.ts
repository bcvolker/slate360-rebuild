import "server-only";

import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { parseCameraPath, type TwinCameraPath } from "@/lib/digital-twin/camera-path-types";
import { canClientSeeCapability } from "@/lib/vnext/scope/resolve-client-scope";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import { userCanManageVnextProject } from "@/lib/vnext/plans/manage-access";

type Admin = any;

export async function readProjectCameraPath(
  admin: Admin,
  projectId: string,
  modelId: string,
): Promise<{ path: TwinCameraPath } | "hidden" | "missing"> {
  const scope = await readClientScope(admin, projectId);
  if (!canClientSeeCapability(scope, "reality")) return "hidden";
  const model = await projectSplat(admin, projectId, modelId);
  if (!model) return "missing";
  return { path: parseCameraPath(model.camera_path) };
}

export async function writeProjectCameraPath(
  admin: Admin,
  userId: string,
  projectId: string,
  projectOrgId: string | null,
  modelId: string,
  raw: unknown,
): Promise<"ok" | "denied" | "hidden" | "missing" | "error"> {
  const allowed = await userCanManageVnextProject(admin, userId, projectId, projectOrgId);
  if (!allowed) return "denied";
  const scope = await readClientScope(admin, projectId);
  if (!canClientSeeCapability(scope, "reality")) return "hidden";
  const model = await projectSplat(admin, projectId, modelId);
  if (!model) return "missing";
  const cameraPath = parseCameraPath(raw);
  const { error } = await admin.from("digital_twin_models").update({ camera_path: cameraPath }).eq("id", modelId);
  if (error) return "error";
  return "ok";
}

async function projectSplat(admin: Admin, projectId: string, modelId: string): Promise<{ camera_path: unknown } | null> {
  const { data: spaces } = await admin
    .from("digital_twin_spaces")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .neq("status", "archived");
  const spaceIds = (spaces ?? []).map((space: { id: string }) => space.id);
  if (spaceIds.length === 0) return null;
  const { data: models } = await admin
    .from("digital_twin_models")
    .select("id, model_format, storage_key, camera_path, space_id")
    .eq("id", modelId)
    .is("deleted_at", null)
    .eq("status", "ready");
  const model = (models ?? []).find((row: { space_id: string; model_format?: string; storage_key?: string }) =>
    spaceIds.includes(row.space_id),
  );
  if (!model) return null;
  if (resolveTwinViewerKind(model.model_format ?? "", model.storage_key ?? "") !== "splat") return null;
  return model;
}
