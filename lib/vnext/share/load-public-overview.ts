import "server-only";

import { resolveProjectLocation } from "@/lib/projects/location";
import { readProjectHistory } from "@/lib/vnext/history/read-project-history";
import { loadPortfolioEvidence } from "@/lib/vnext/load-portfolio-evidence";
import type { VnextProjectOverview } from "@/lib/vnext/overview-types";
import type { PortfolioEvidence } from "@/lib/vnext/portfolio-types";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import { composePublicOverview, publicVisitMoments } from "./public-overview";
import { sharePath, type PublicSection } from "./share-rules";

type Admin = any;

const EMPTY_EVIDENCE: PortfolioEvidence = {
  realityPreviewUrl: null,
  pano360Url: null,
  droneUrl: null,
  planUrl: null,
  timestamps: [],
  representations: [],
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readMetaString(metadata: Record<string, unknown> | null, key: string): string | null {
  return asString(metadata?.[key]);
}

export async function loadPublicOverview(
  admin: Admin,
  projectId: string,
  token: string,
  sections: readonly PublicSection[],
): Promise<VnextProjectOverview | null> {
  const { data } = await admin
    .from("projects")
    .select("id, name, metadata, client_name, address, location, latitude, longitude")
    .eq("id", projectId)
    .maybeSingle();
  if (!data?.id || !data?.name) return null;

  const metadata = (data.metadata ?? null) as Record<string, unknown> | null;
  const location = resolveProjectLocation(metadata, {
    fallbackAddress: asString(data.address),
    legacyLocation: asString(data.location),
    city: readMetaString(metadata, "city"),
    state: readMetaString(metadata, "state"),
    region: readMetaString(metadata, "region"),
  });
  const clientName = asString(data.client_name);
  const name = String(data.name);
  const context = clientName && clientName.toLowerCase() !== name.toLowerCase() ? clientName : null;
  const rawLocation = location.label.trim() || null;
  const locationLabel =
    rawLocation && rawLocation.toLowerCase() !== (context ?? "").toLowerCase() ? rawLocation : null;

  const scope = await readClientScope(admin, projectId);
  const evidenceById = await loadPortfolioEvidence(admin, [projectId]);
  const base = sharePath(token);
  const history = await readProjectHistory(admin, projectId, {
    exploreBase: `${base}/explore`,
    itemsBase: base,
  });

  return composePublicOverview({
    id: String(data.id),
    name,
    context,
    locationLabel,
    evidence: evidenceById[projectId] ?? EMPTY_EVIDENCE,
    projectId,
    token,
    sections,
    publishedVisits: publicVisitMoments(history.visits, scope),
  });
}
