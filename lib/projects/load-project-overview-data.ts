import "server-only";

import { notFound } from "next/navigation";
import { APP_STORE_MODE } from "@/lib/app-store-mode";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveProjectLocation } from "@/lib/projects/location";
import { loadProjectPeople } from "@/lib/server/collaborator-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNamespace } from "@/lib/slatedrop/storage";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export type ProjectOverviewActivity = {
  id: string;
  kind: "walk" | "twin" | "file";
  title: string;
  meta: string;
  href: string;
  occurredAt: string;
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
  };
  lastFileUploadAt: string | null;
  recentActivity: ProjectOverviewActivity[];
  showTwins: boolean;
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
  const showTwins = !APP_STORE_MODE;
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
    ...((recentWalksRes.data ?? []) as Array<{ id: string; title: string; status: string; updated_at: string }>).map(
      (walk) => ({
        id: `walk:${walk.id}`,
        kind: "walk" as const,
        title: walk.title || "Site Walk",
        meta: formatStatusLabel(walk.status),
        href: `/site-walk/capture-v2?session=${encodeURIComponent(walk.id)}`,
        occurredAt: walk.updated_at,
      }),
    ),
    ...((recentTwinsRes.data ?? []) as Array<{ id: string; title: string; status: string; updated_at: string }>).map(
      (twin) => ({
        id: `twin:${twin.id}`,
        kind: "twin" as const,
        title: twin.title || "Digital Twin",
        meta: formatStatusLabel(twin.status),
        href: `/digital-twin/twins/${encodeURIComponent(twin.id)}`,
        occurredAt: twin.updated_at,
      }),
    ),
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

  return {
    projectId: project.id,
    name: project.name,
    status: formatStatusLabel(project.status),
    locationLabel: location.label || "Location not set",
    description: project.description,
    startDate: readMetaDate(metadata, "start_date", "startDate"),
    endDate: readMetaDate(metadata, "end_date", "endDate"),
    counts: {
      walks: walkCountRes.count ?? 0,
      twins: twinCountRes.count ?? 0,
      files: filesCount,
      deliverables: deliverableCountRes.count ?? 0,
      teamMembers,
    },
    lastFileUploadAt,
    recentActivity: activity,
    showTwins,
  };
}
