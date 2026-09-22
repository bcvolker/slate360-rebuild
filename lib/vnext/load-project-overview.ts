import "server-only";

import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveProjectLocation } from "@/lib/projects/location";
import { resolveNamespace } from "@/lib/slatedrop/storage";
import { loadPortfolioEvidence } from "@/lib/vnext/load-portfolio-evidence";
import { vnextProjectHref } from "@/lib/vnext/nav";
import { formatPlainDate, pickLatestVisit } from "@/lib/vnext/overview-visit";
import { formatDocumentedDate, pickLatestIso, resolveProjectHero, satelliteMapUrl } from "@/lib/vnext/project-hero";
import { canClientSeeCapability } from "@/lib/vnext/scope/resolve-client-scope";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import type { ClientProjectScope } from "@/lib/vnext/scope/resolve-client-scope";
import type { VnextProjectOverview, VnextRecentDocument, VnextRecentItem } from "@/lib/vnext/overview-types";

const LOAD_ERROR = "This project could not be loaded. Check your connection and try again.";

type ScopedAdmin = Awaited<ReturnType<typeof getScopedProjectForUser>>["admin"];

type ProjectRow = {
  id: string;
  name: string;
  metadata: Record<string, unknown> | null;
  status: string | null;
  org_id: string | null;
  thumbnail_url: string | null;
  client_name: string | null;
  address: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readMetaString(metadata: Record<string, unknown> | null, key: string): string | null {
  return asString(metadata?.[key]);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function formatItemStatus(status: string): string {
  const raw = (status || "").trim();
  if (!raw) return "Status unknown";
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function loadLatestVisit(admin: ScopedAdmin, projectId: string, scope: ClientProjectScope) {
  const [sessions, captures, thermal] = await Promise.all([
    admin
      .from("site_walk_sessions")
      .select("started_at, completed_at, updated_at")
      .eq("project_id", projectId)
      .neq("status", "archived"),
    admin
      .from("digital_twin_captures")
      .select("uploaded_at, created_at")
      .eq("project_id", projectId)
      .is("deleted_at", null),
    admin
      .from("thermal_analysis_sessions")
      .select("updated_at")
      .eq("project_id", projectId)
      .is("deleted_at", null),
  ]);

  const candidates = [
    ...(canClientSeeCapability(scope, "history") || canClientSeeCapability(scope, "items")
      ? (sessions.data ?? []).map((row) => ({
      iso: row.completed_at || row.started_at || row.updated_at,
      sourceLabel: "Site visit",
    }))
      : []),
    ...(canClientSeeCapability(scope, "reality") || canClientSeeCapability(scope, "geometry")
      ? (captures.data ?? []).map((row) => ({
          iso: row.uploaded_at || row.created_at,
          sourceLabel: "3D scan",
        }))
      : []),
    ...(canClientSeeCapability(scope, "thermal")
      ? (thermal.data ?? []).map((row) => ({ iso: row.updated_at, sourceLabel: "Thermal scan" }))
      : []),
  ];

  const latest = pickLatestVisit(candidates);
  if (!latest) return null;
  const dateLabel = formatPlainDate(latest.occurredAt);
  if (!dateLabel) return null;
  return { occurredAt: latest.occurredAt, sourceLabel: latest.sourceLabel, dateLabel };
}

async function loadRecentItems(admin: ScopedAdmin, projectId: string): Promise<VnextRecentItem[]> {
  const { data } = await admin
    .from("site_walk_items")
    .select("id, title, item_status, updated_at")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(5);

  return (data ?? [])
    .map((row) => ({
      id: row.id,
      title: asString(row.title) ?? "Untitled item",
      statusLabel: formatItemStatus(row.item_status),
      updatedAt: row.updated_at,
      dateLabel: formatPlainDate(row.updated_at) ?? "",
    }))
    .filter((item) => item.dateLabel !== "");
}

async function loadRecentDocuments(
  admin: ScopedAdmin,
  orgId: string | null,
  userId: string,
  projectId: string,
): Promise<VnextRecentDocument[]> {
  const { data: folders } = await admin.from("project_folders").select("id").eq("project_id", projectId);
  const folderIds = (folders ?? []).map((folder) => folder.id).filter(Boolean) as string[];
  if (folderIds.length === 0) return [];

  const namespace = resolveNamespace(orgId, userId);
  const filters = folderIds.map(
    (folderId) => `s3_key.like.${escapeLike(`orgs/${namespace}/${folderId}/`)}%`,
  );

  let query = admin
    .from("slatedrop_uploads")
    .select("id, file_name, created_at")
    .eq("status", "active")
    .or(filters.join(","))
    .order("created_at", { ascending: false })
    .limit(5);
  query = orgId ? query.eq("org_id", orgId) : query.eq("uploaded_by", userId);

  const { data } = await query;
  return (data ?? [])
    .map((row) => ({
      id: row.id,
      name: row.file_name,
      uploadedAt: row.created_at,
      dateLabel: formatPlainDate(row.created_at) ?? "",
    }))
    .filter((document) => document.dateLabel !== "");
}

export async function loadVnextProjectOverview(
  userId: string,
  projectId: string,
): Promise<{ overview: VnextProjectOverview | null; error: string | null }> {
  const { admin, orgId: scopeOrgId, project } = await getScopedProjectForUser(
    userId,
    projectId,
    "id, name, metadata, status, org_id, thumbnail_url, client_name, address, location, latitude, longitude",
  );
  if (!project) return { overview: null, error: null };

  const row = project as unknown as ProjectRow;
  if (!row.id || !row.name) return { overview: null, error: null };

  const location = resolveProjectLocation(row.metadata, {
    fallbackAddress: row.address,
    legacyLocation: row.location,
    city: readMetaString(row.metadata, "city"),
    state: readMetaString(row.metadata, "state"),
    region: readMetaString(row.metadata, "region"),
  });
  const lat = row.latitude ?? location.lat;
  const lng = row.longitude ?? location.lng;
  const clientName = asString(row.client_name);
  const context = clientName && clientName.toLowerCase() !== row.name.toLowerCase() ? clientName : null;
  const rawLocationLabel = location.label.trim() || null;
  const locationLabel =
    rawLocationLabel && rawLocationLabel.toLowerCase() !== (context ?? "").toLowerCase()
      ? rawLocationLabel
      : null;
  const orgId = row.org_id ?? scopeOrgId;

  const base: VnextProjectOverview = {
    id: row.id,
    name: row.name,
    context,
    locationLabel,
    hero: { kind: "neutral", url: null },
    documentedLabel: null,
    latestVisit: null,
    representations: [],
    recentItems: [],
    recentDocuments: [],
    exploreHref: `${vnextProjectHref(row.id)}/explore`,
    itemsHref: `${vnextProjectHref(row.id)}/items`,
    documentsHref: `${vnextProjectHref(row.id)}/documents`,
    historyHref: `${vnextProjectHref(row.id)}/history`,
  };

  try {
    const scope = await readClientScope(admin, row.id);
    const [evidenceById, latestVisit, recentItems, recentDocuments] = await Promise.all([
      loadPortfolioEvidence(admin, [row.id]),
      loadLatestVisit(admin, row.id, scope),
      canClientSeeCapability(scope, "items") ? loadRecentItems(admin, row.id) : Promise.resolve([]),
      canClientSeeCapability(scope, "documents")
        ? loadRecentDocuments(admin, orgId, userId, row.id)
        : Promise.resolve([]),
    ]);
    const evidence = evidenceById[row.id];
    const documentedAt = pickLatestIso(evidence?.timestamps ?? []);
    const hero = resolveProjectHero({
      reality: evidence?.realityPreviewUrl,
      pano360: evidence?.pano360Url,
      drone: evidence?.droneUrl,
      plan: evidence?.planUrl,
      projectImage: row.thumbnail_url,
      satellite: lat != null && lng != null ? satelliteMapUrl(lat, lng) : null,
    });

    return {
      overview: {
        ...base,
        hero,
        documentedLabel: formatDocumentedDate(documentedAt),
        latestVisit,
        representations: evidence?.representations ?? [],
        recentItems,
        recentDocuments,
      },
      error: null,
    };
  } catch {
    return { overview: base, error: LOAD_ERROR };
  }
}
