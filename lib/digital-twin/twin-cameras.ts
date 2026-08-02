/**
 * Photo Explorer cameras.json — poses baked by Modal workers next to the model.
 * Exterior writes a bare array; interior writes `{ cameras: [...] }`.
 */

export type TwinCameraPose = {
  assetId?: string | null;
  filename: string;
  registered: boolean;
  position?: [number, number, number] | number[];
  /** Quaternion [x, y, z, w] in model / viewer space. */
  rotation?: [number, number, number, number] | number[];
  focal?: number | null;
  width?: number | null;
  height?: number | null;
};

export type TwinCamerasDocument = {
  version?: number;
  coordinateSystem?: string;
  cameraCount: number;
  cameras: TwinCameraPose[];
};

function normalizeCamerasPayload(data: unknown): TwinCamerasDocument | null {
  if (Array.isArray(data)) {
    const cameras = data.filter(
      (row): row is TwinCameraPose =>
        !!row && typeof row === "object" && typeof (row as TwinCameraPose).filename === "string",
    );
    return { cameraCount: cameras.length, cameras };
  }
  if (!data || typeof data !== "object") return null;
  const doc = data as { cameras?: unknown; cameraCount?: unknown };
  if (!Array.isArray(doc.cameras)) return null;
  const cameras = doc.cameras.filter(
    (row): row is TwinCameraPose =>
      !!row && typeof row === "object" && typeof (row as TwinCameraPose).filename === "string",
  );
  return {
    ...(data as TwinCamerasDocument),
    cameraCount: typeof doc.cameraCount === "number" ? doc.cameraCount : cameras.length,
    cameras,
  };
}

/** Resolve cameras.json fetch URL from a model stream URL (share or auth). */
export function twinCamerasEndpoint(modelUrl: string): string | null {
  const shareMatch = modelUrl.match(/\/api\/share\/twin\/([^/?]+)\/(?:splat|model)(?:$|\?)/);
  if (shareMatch) return `/api/share/twin/${shareMatch[1]}/cameras`;
  const authMatch = modelUrl.match(/\/api\/digital-twin\/models\/([^/?]+)\/(?:splat|model)(?:$|\?)/);
  if (authMatch) return `/api/digital-twin/models/${authMatch[1]}/cameras`;
  return null;
}

export async function fetchTwinCameras(modelUrl: string): Promise<TwinCamerasDocument | null> {
  const endpoint = twinCamerasEndpoint(modelUrl);
  if (!endpoint) return null;
  try {
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    return normalizeCamerasPayload(await res.json());
  } catch {
    return null;
  }
}

export function twinPhotoUrl(modelUrl: string, assetId: string): string | null {
  const shareMatch = modelUrl.match(/\/api\/share\/twin\/([^/?]+)\//);
  if (shareMatch) return `/api/share/twin/${shareMatch[1]}/photo/${assetId}`;
  const authMatch = modelUrl.match(/\/api\/digital-twin\/models\/([^/?]+)\//);
  if (authMatch) return `/api/digital-twin/models/${authMatch[1]}/photo/${assetId}`;
  return null;
}

export function isRegisteredCamera(cam: TwinCameraPose): boolean {
  return (
    cam.registered === true &&
    Array.isArray(cam.position) &&
    cam.position.length >= 3 &&
    Array.isArray(cam.rotation) &&
    cam.rotation.length >= 4
  );
}
