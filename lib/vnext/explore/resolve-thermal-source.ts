import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { loadThermalShareViewerData } from "@/lib/thermal/load-share-viewer";
import type { VnextExploreSourceData } from "@/lib/vnext/explore-types";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Loads a read-only thermal view for a project without minting or exposing a public share token
 * to the client. Reuses loadThermalShareViewerData (lib/thermal/load-share-viewer.ts), which takes
 * a bare sessionId and performs no token validation itself — the caller (here) is responsible for
 * confirming a real, currently-published share exists for that session before calling it, which is
 * exactly the same "published, non-revoked" check lib/vnext/load-portfolio-evidence.ts already
 * performs for the Overview "thermal" flag, extended to also honor expires_at (a token can be
 * un-revoked but still time-expired).
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

  const { data: shares } = await admin
    .from("thermal_analysis_share_tokens")
    .select("session_id, is_revoked, expires_at, branding_snapshot, layer_config")
    .in("session_id", sessionIds);

  const now = Date.now();
  const published = (shares ?? []).filter((share) => {
    if (share.is_revoked) return false;
    if (share.expires_at && Date.parse(share.expires_at as string) < now) return false;
    return true;
  });
  if (published.length === 0) return null;

  const publishedSessionIds = new Set(published.map((s) => s.session_id as string));
  const bestSession = (sessions ?? [])
    .filter((s) => publishedSessionIds.has(s.id as string))
    .sort((a, b) => Date.parse(b.updated_at as string) - Date.parse(a.updated_at as string))[0];
  if (!bestSession) return null;

  const share = published.find((s) => s.session_id === bestSession.id);
  const viewerData = await loadThermalShareViewerData(
    bestSession.id as string,
    (share?.branding_snapshot as Record<string, unknown>) ?? {},
    (share?.layer_config as Record<string, unknown>) ?? {},
  );
  if (!viewerData) return null;

  return {
    kind: "thermal",
    sessionName: viewerData.sessionName || (bestSession.name as string) || "Thermal session",
    captures: viewerData.captures
      .filter((c) => c.previewUrl)
      .map((c) => ({
        id: c.id,
        imageUrl: c.previewUrl as string,
        label: c.filename ?? "Capture",
      })),
  };
}
