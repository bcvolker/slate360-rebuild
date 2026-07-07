import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type DashboardHomeCounts = {
  projects: number;
  siteWalks: number;
  digitalTwins: number;
  /** Walks with status "in_progress" — an actionable count, not a vanity total. */
  walksInProgress: number;
  /** Twins with status "draft" — an actionable count, not a vanity total. */
  twinsDraft: number;
};

export type DashboardNeedsAttentionItem = {
  id: string;
  title: string;
  message: string;
  linkPath: string | null;
  createdAt: string;
};

export type DashboardRecentProject = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  /** Optional preview image (site-walk photo or twin) for image-backed cards. */
  imageUrl?: string | null;
};

export type DashboardRecentWalk = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
};

export type DashboardRecentTwin = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  imageUrl?: string | null;
};

export type DashboardHomeData = {
  counts: DashboardHomeCounts;
  recentProjects: DashboardRecentProject[];
  recentWalks: DashboardRecentWalk[];
  recentTwins: DashboardRecentTwin[];
  needsAttention: DashboardNeedsAttentionItem[];
};

const EMPTY: DashboardHomeData = {
  counts: { projects: 0, siteWalks: 0, digitalTwins: 0, walksInProgress: 0, twinsDraft: 0 },
  recentProjects: [],
  recentWalks: [],
  recentTwins: [],
  needsAttention: [],
};

export async function loadDashboardHomeData(orgId: string | null, userId: string | null): Promise<DashboardHomeData> {
  if (!orgId) return EMPTY;

  const admin = createAdminClient();

  const [
    projectCountRes,
    walkCountRes,
    twinCountRes,
    walksInProgressRes,
    twinsDraftRes,
    recentProjectsRes,
    recentWalksRes,
    recentTwinsRes,
    needsAttentionRes,
  ] = await Promise.all([
    admin.from("projects").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    admin
      .from("site_walk_sessions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .neq("status", "archived"),
    admin
      .from("digital_twin_spaces")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .neq("status", "archived"),
    admin
      .from("site_walk_sessions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "in_progress"),
    admin
      .from("digital_twin_spaces")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .eq("status", "draft"),
    admin
      .from("projects")
      .select("id, name, status, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(6),
    admin
      .from("site_walk_sessions")
      .select("id, title, status, updated_at")
      .eq("org_id", orgId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(6),
    admin
      .from("digital_twin_spaces")
      .select("id, title, status, updated_at")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(6),
    userId
      ? admin
          .from("project_notifications")
          .select("id, title, message, link_path, created_at")
          .eq("user_id", userId)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({
          data: [] as { id: string; title: string; message: string; link_path: string | null; created_at: string }[] | null,
        }),
  ]);

  const recentProjects: DashboardRecentProject[] = (recentProjectsRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status ?? "active",
    createdAt: row.created_at,
  }));
  const recentTwins: DashboardRecentTwin[] = (recentTwinsRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    updatedAt: row.updated_at,
  }));

  // Resolve a real snapshot for the two candidates that could become the Featured
  // Project tile (docs/design/DASHBOARD_VISION.md flagged imageUrl as typed but
  // never populated) — only for the single newest project/twin, not the whole list.
  const [firstPhotoRes, primaryModelRes] = await Promise.all([
    recentProjects[0]
      ? admin
          .from("site_walk_items")
          .select("id")
          .eq("org_id", orgId)
          .eq("project_id", recentProjects[0].id)
          .eq("item_type", "photo")
          .is("deleted_at", null)
          .order("captured_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    recentTwins[0]
      ? admin
          .from("digital_twin_models")
          .select("id")
          .eq("org_id", orgId)
          .eq("space_id", recentTwins[0].id)
          .eq("is_primary", true)
          .is("deleted_at", null)
          .not("preview_storage_key", "is", null)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (recentProjects[0] && firstPhotoRes.data?.id) {
    recentProjects[0].imageUrl = `/api/site-walk/items/${firstPhotoRes.data.id}/image`;
  }
  if (recentTwins[0] && primaryModelRes.data?.id) {
    recentTwins[0].imageUrl = `/api/digital-twin/models/${primaryModelRes.data.id}/preview-image`;
  }

  return {
    counts: {
      projects: projectCountRes.count ?? 0,
      siteWalks: walkCountRes.count ?? 0,
      digitalTwins: twinCountRes.count ?? 0,
      walksInProgress: walksInProgressRes.count ?? 0,
      twinsDraft: twinsDraftRes.count ?? 0,
    },
    recentProjects,
    recentWalks: (recentWalksRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      updatedAt: row.updated_at,
    })),
    recentTwins,
    needsAttention: (needsAttentionRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      linkPath: row.link_path,
      createdAt: row.created_at,
    })),
  };
}
