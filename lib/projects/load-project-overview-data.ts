import "server-only";

import { notFound } from "next/navigation";
import { APP_STORE_MODE } from "@/lib/app-store-mode";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveProjectLocation } from "@/lib/projects/location";
import { loadProjectPeople } from "@/lib/server/collaborator-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNamespace } from "@/lib/slatedrop/storage";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveClientSurfaceFlags } from "@/lib/spatial-walkthrough/access";
import { isSpatialOnlyPortal } from "@/lib/spatial-walkthrough/client-surface";

export type ProjectOverviewActivity = {
  id: string;
  kind: "walk" | "twin" | "file" | "walkthrough" | "pin";
  title: string;
  meta: string;
  href: string;
  occurredAt: string;
};

export type ProjectOverviewWalkthrough = {
  id: string;
  title: string;
  capturedAt: string | null;
  building: string | null;
  floor: string | null;
  href: string;
};

export type ProjectOverviewPin = {
  id: string;
  title: string;
  meta: string;
  href: string;
};

export type ProjectOverviewData = {
  projectId: string;
  name: string;
  status: string;
  locationLabel: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  counts: {
    walks: number;
    twins: number;
    files: number;
    deliverables: number;
    teamMembers: number;
    walkthroughs: number;
  };
  lastFileUploadAt: string | null;
  recentActivity: ProjectOverviewActivity[];
  latestWalkthrough: ProjectOverviewWalkthrough | null;
  recentWalkthroughs: ProjectOverviewWalkthrough[];
  recentFiles: ProjectOverviewActivity[];
  recentPins: ProjectOverviewPin[];
  showTwins: boolean;
  showSiteWalk: boolean;
  showWalkthroughs: boolean;
  spatialOnly: boolean;
};

type ProjectMetadata = {
  address?: string;
  city?: string;
  state?: string;
  region?: string;
  start_date?: string;
  end_date?: string;
  startDate?: string;
  endDate?: string;
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function formatStatusLabel(status: string | null | undefined): string {
  const raw = (status ?? "active").trim();
  if (!raw) return "Active";
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readMetaDate(metadata: ProjectMetadata, ...keys: Array<keyof ProjectMetadata>): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function loadProjectOverviewData(projectId: string): Promise<ProjectOverviewData> {
  const context = await resolveServerOrgContext();
  if (!context.user) notFound();

  const { project: scopedProject } = await getScopedProjectForUser(
    context.user.id,
    projectId,
    "id, name, status, description, metadata, org_id, created_at",
  );

  if (!scopedProject) notFound();

  const project = scopedProject as unknown as {
    id: string;
    name: string;
    status: string | null;
    description: string | null;
    metadata: ProjectMetadata | null;
    org_id: string | null;
  };

  const orgId = project.org_id ?? context.orgId;
  const admin = createAdminClient();
  const flags = await resolveClientSurfaceFlags(orgId, Boolean(context.isSlateCeo));
  const showTwins = !APP_STORE_MODE && flags.twin360;
  const showSiteWalk = flags.siteWalk;
  const showWalkthroughs = flags.spatialWalkthrough;
  const metadata = project.metadata ?? {};
  const location = resolveProjectLocation(metadata, {
    fallbackAddress: metadata.address,
    city: metadata.city,
    state: metadata.state,
    region: metadata.region,
  });

  const [
    walkCountRes,
    twinCountRes,
    deliverableCountRes,
    foldersRes,
    recentWalksRes,
    recentTwinsRes,
    people,
    walkthroughCountRes,
  ] = await Promise.all([
    admin
      .from("site_walk_sessions")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .neq("status", "archived"),
    showTwins
      ? admin
          .from("digital_twin_spaces")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .neq("status", "archived")
      : Promise.resolve({ count: 0, data: null, error: null }),
    admin
      .from("site_walk_deliverables")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    admin.from("project_folders").select("id").eq("project_id", projectId),
    admin
      .from("site_walk_sessions")
      .select("id, title, status, updated_at")
      .eq("project_id", projectId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(5),
    showTwins
      ? admin
          .from("digital_twin_spaces")
          .select("id, title, status, updated_at")
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .neq("status", "archived")
          .order("updated_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
    loadProjectPeople(projectId, orgId ?? null),
    showWalkthroughs
      ? admin
          .from("spatial_walkthroughs")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
      : Promise.resolve({ count: 0, data: null, error: null }),
  ]);

  const folderIds = (foldersRes.data ?? []).map((folder) => folder.id).filter(Boolean);
  let filesCount = 0;
  let lastFileUploadAt: string | null = null;
  let recentFiles: Array<{ id: string; file_name: string; created_at: string }> = [];

  if (folderIds.length > 0) {
    const namespace = resolveNamespace(orgId, context.user.id);
    const filters = folderIds.map(
      (folderId) => `s3_key.like.${escapeLike(`orgs/${namespace}/${folderId}/`)}%`,
    );

    let countQuery = admin
      .from("slatedrop_uploads")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .or(filters.join(","));

    countQuery = orgId ? countQuery.eq("org_id", orgId) : countQuery.eq("uploaded_by", context.user.id);

    let recentQuery = admin
      .from("slatedrop_uploads")
      .select("id, file_name, created_at")
      .eq("status", "active")
      .or(filters.join(","))
      .order("created_at", { ascending: false })
      .limit(5);

    recentQuery = orgId ? recentQuery.eq("org_id", orgId) : recentQuery.eq("uploaded_by", context.user.id);

    const [countRes, recentRes] = await Promise.all([countQuery, recentQuery]);
    filesCount = countRes.count ?? 0;
    recentFiles = recentRes.data ?? [];
    lastFileUploadAt = recentFiles[0]?.created_at ?? null;
  }

  const teamMembers =
    people.members.length + people.pendingInvites.length;

  const activity: ProjectOverviewActivity[] = [
    ...(showSiteWalk
      ? ((recentWalksRes.data ?? []) as Array<{ id: string; title: string; status: string; updated_at: string }>).map(
          (walk) => ({
            id: `walk:${walk.id}`,
            kind: "walk" as const,
            title: walk.title || "Site Walk",
            meta: formatStatusLabel(walk.status),
            href: `/site-walk/capture-v2?session=${encodeURIComponent(walk.id)}`,
            occurredAt: walk.updated_at,
          }),
        )
      : []),
    ...(showTwins
      ? ((recentTwinsRes.data ?? []) as Array<{ id: string; title: string; status: string; updated_at: string }>).map(
          (twin) => ({
            id: `twin:${twin.id}`,
            kind: "twin" as const,
            title: twin.title || "Digital Twin",
            meta: formatStatusLabel(twin.status),
            href: `/digital-twin/twins/${encodeURIComponent(twin.id)}`,
            occurredAt: twin.updated_at,
          }),
        )
      : []),
    ...recentFiles.map((file) => ({
      id: `file:${file.id}`,
      kind: "file" as const,
      title: file.file_name,
      meta: "File uploaded",
      href: `/projects/${projectId}/slatedrop`,
      occurredAt: file.created_at,
    })),
  ]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 5);

  const fileActivities: ProjectOverviewActivity[] = recentFiles.map((file) => ({
    id: `file:${file.id}`,
    kind: "file",
    title: file.file_name,
    meta: "File uploaded",
    href: `/projects/${projectId}/slatedrop`,
    occurredAt: file.created_at,
  }));

  let recentWalkthroughs: ProjectOverviewWalkthrough[] = [];
  let recentPins: ProjectOverviewPin[] = [];
  if (showWalkthroughs) {
    const [{ data: wtRows }, { data: pinRows }] = await Promise.all([
      admin
        .from("spatial_walkthroughs")
        .select("id, title, captured_at, building, floor")
        .eq("project_id", projectId)
        .order("captured_at", { ascending: false })
        .limit(5),
      admin
        .from("spatial_pins")
        .select("id, label, pin_type, walkthrough_id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    recentWalkthroughs = ((wtRows ?? []) as Array<{
      id: string;
      title: string;
      captured_at: string | null;
      building: string | null;
      floor: string | null;
    }>).map((row) => ({
      id: row.id,
      title: row.title || "Spatial Walkthrough",
      capturedAt: row.captured_at,
      building: row.building,
      floor: row.floor,
      href: `/projects/${projectId}/walkthroughs/${row.id}`,
    }));
    recentPins = ((pinRows ?? []) as Array<{
      id: string;
      label: string;
      pin_type: string;
      walkthrough_id: string;
    }>).map((pin) => ({
      id: pin.id,
      title: pin.label || "Pin",
      meta: pin.pin_type,
      href: `/projects/${projectId}/walkthroughs/${pin.walkthrough_id}`,
    }));
  }

  return {
    projectId: project.id,
    name: project.name,
    status: formatStatusLabel(project.status),
    locationLabel: location.label || "Location not set",
    description: project.description,
    startDate: readMetaDate(metadata, "start_date", "startDate"),
    endDate: readMetaDate(metadata, "end_date", "endDate"),
    counts: {
      walks: showSiteWalk ? (walkCountRes.count ?? 0) : 0,
      twins: showTwins ? (twinCountRes.count ?? 0) : 0,
      files: filesCount,
      deliverables: showSiteWalk ? (deliverableCountRes.count ?? 0) : 0,
      teamMembers,
      walkthroughs: walkthroughCountRes.count ?? 0,
    },
    lastFileUploadAt,
    recentActivity: activity,
    latestWalkthrough: recentWalkthroughs[0] ?? null,
    recentWalkthroughs,
    recentFiles: fileActivities,
    recentPins,
    showTwins,
    showSiteWalk,
    showWalkthroughs,
    spatialOnly: isSpatialOnlyPortal(flags),
  };
}
