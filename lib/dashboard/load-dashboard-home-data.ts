import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type DashboardHomeCounts = {
  projects: number;
  siteWalks: number;
  digitalTwins: number;
};

export type DashboardRecentProject = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
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
};

export type DashboardHomeData = {
  counts: DashboardHomeCounts;
  recentProjects: DashboardRecentProject[];
  recentWalks: DashboardRecentWalk[];
  recentTwins: DashboardRecentTwin[];
};

const EMPTY: DashboardHomeData = {
  counts: { projects: 0, siteWalks: 0, digitalTwins: 0 },
  recentProjects: [],
  recentWalks: [],
  recentTwins: [],
};

export async function loadDashboardHomeData(orgId: string | null): Promise<DashboardHomeData> {
  if (!orgId) return EMPTY;

  const admin = createAdminClient();

  const [
    projectCountRes,
    walkCountRes,
    twinCountRes,
    recentProjectsRes,
    recentWalksRes,
    recentTwinsRes,
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
  ]);

  return {
    counts: {
      projects: projectCountRes.count ?? 0,
      siteWalks: walkCountRes.count ?? 0,
      digitalTwins: twinCountRes.count ?? 0,
    },
    recentProjects: (recentProjectsRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status ?? "active",
      createdAt: row.created_at,
    })),
    recentWalks: (recentWalksRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      updatedAt: row.updated_at,
    })),
    recentTwins: (recentTwinsRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      updatedAt: row.updated_at,
    })),
  };
}
