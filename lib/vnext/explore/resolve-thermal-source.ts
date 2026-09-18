import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { loadThermalShareViewerData } from "@/lib/thermal/load-share-viewer";
import { isThermalSessionAvailable, type ThermalCaptureLike, type ThermalShareLike } from "@/lib/vnext/thermal-availability";
import type { VnextExploreSourceData } from "@/lib/vnext/explore-types";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Loads a read-only thermal view for a project without minting or exposing a public share token
 * to the client. Reuses loadThermalShareViewerData (lib/thermal/load-share-viewer.ts), which takes
 * a bare sessionId and performs no token validation itself — the caller (here) is responsible for
 * confirming a real, currently-published share exists for that session before calling it. Session
 * selection uses the same isThermalSessionAvailable predicate load-portfolio-evidence.ts uses for
 * the Overview "thermal" flag (lib/vnext/thermal-availability.ts), so the two can't drift: a
 * published share with zero viewable captures (all excluded by layer_config, or none have a usable
 * path) is treated as not available here either, not just at the Overview summary level.
 */
export async function resolveThermalSourceData(
  admin: Admin,
  projectId: string,
): Promise<VnextExploreSourceData | null> {
  const { data: sessions } = await admin
    .from("thermal_analysis_sessions")
    .select("id, name, updated_at")
    .eq("project_id", projectId)
    .is("deleted_at", null);
  const sessionIds = (sessions ?? []).map((s) => s.id as string);
  if (sessionIds.length === 0) return null;

  const { data: shareRows } = await admin
    .from("thermal_analysis_share_tokens")
    .select("session_id, is_revoked, expires_at, branding_snapshot, layer_config")
    .in("session_id", sessionIds);
  const shares: ThermalShareLike[] = (shareRows ?? []).map((row) => ({
    sessionId: row.session_id as string,
    isRevoked: row.is_revoked as boolean,
    expiresAt: row.expires_at as string | null,
    layerConfig: row.layer_config as Record<string, unknown> | null,
  }));

  const { data: captureRows } = await admin
    .from("thermal_captures")
    .select("id, session_id, preview_path, storage_path")
    .in("session_id", sessionIds)
    .is("deleted_at", null);
  const captures: ThermalCaptureLike[] = (captureRows ?? []).map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    previewPath: row.preview_path as string | null,
    storagePath: row.storage_path as string | null,
  }));

  const bestSession = (sessions ?? [])
    .filter((s) => isThermalSessionAvailable(s.id as string, shares, captures))
    .sort((a, b) => Date.parse(b.updated_at as string) - Date.parse(a.updated_at as string))[0];
  if (!bestSession) return null;

  const now = Date.now();
  const share = shares.find(
    (s) =>
      s.sessionId === bestSession.id &&
      !s.isRevoked &&
      (!s.expiresAt || Date.parse(s.expiresAt) >= now),
  );
  const rawShare = (shareRows ?? []).find((row) => row.session_id === bestSession.id);
  const viewerData = await loadThermalShareViewerData(
    bestSession.id as string,
    (rawShare?.branding_snapshot as Record<string, unknown>) ?? {},
    share?.layerConfig ?? {},
  );
  if (!viewerData) return null;

  const mappedCaptures = viewerData.captures
    .filter((c) => c.previewUrl)
    .map((c) => ({
      id: c.id,
      imageUrl: c.previewUrl as string,
      label: c.filename ?? "Capture",
    }));
  // Guards against exactly the drift this predicate exists to prevent: a session that looked
  // available by the shared predicate but, once actually resolved, has no signable preview left.
  if (mappedCaptures.length === 0) return null;

  return {
    kind: "thermal",
    sessionName: viewerData.sessionName || (bestSession.name as string) || "Thermal session",
    captures: mappedCaptures,
  };
}
