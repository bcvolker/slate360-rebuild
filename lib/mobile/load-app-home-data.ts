import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loadSiteWalkHubData } from "@/lib/site-walk/load-hub-data";
import type { HubSummary } from "@/lib/types/site-walk";
import { loadMobileAssignments, type MobileHomeAssignment } from "./load-mobile-assignments";

export type MobileAppHomeAlert = {
  id: string;
  message: string;
  severity: string;
  createdAt: string;
};

export type MobileAppHomeRecentWalk = {
  id: string;
  title: string;
  createdAt: string;
};

export type MobileAppHomeRecentDeliverable = {
  id: string;
  title: string;
  createdAt: string;
};

export type MobileAppHomeSlateDropItem = {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
};

export type MobileAppHomeData = {
  recentWalks: MobileAppHomeRecentWalk[];
  recentDeliverables: MobileAppHomeRecentDeliverable[];
  recentSlateDrop: MobileAppHomeSlateDropItem[];
  processingQueue: MobileAppHomeSlateDropItem[];
  alerts: MobileAppHomeAlert[];
  assignments: MobileHomeAssignment[];
  hubSummary: HubSummary;
};

const EMPTY_SUMMARY: HubSummary = {
  openItems: 0,
  needsReview: 0,
  draftDeliverables: 0,
  unsyncedItems: 0,
};

export async function loadMobileAppHomeData(
  orgId: string | null,
  userId: string | null,
): Promise<MobileAppHomeData> {
  if (!orgId) {
    return {
      recentWalks: [],
      recentDeliverables: [],
      recentSlateDrop: [],
      processingQueue: [],
      alerts: [],
      assignments: [],
      hubSummary: EMPTY_SUMMARY,
    };
  }

  const admin = createAdminClient();
  const supabase = await createClient();
  const hubPromise = loadSiteWalkHubData(orgId);
  const assignmentsPromise =
    userId ? loadMobileAssignments(orgId, userId) : Promise.resolve([]);

  const [
    hub,
    assignments,
    walksRes,
    deliverablesRes,
    recentDropRes,
    processingRes,
    alertsRes,
  ] = await Promise.all([
    hubPromise,
    assignmentsPromise,
    admin
      .from("site_walk_sessions")
      .select("id, title, created_at")
      .eq("org_id", orgId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(8),
    admin
      .from("site_walk_deliverables")
      .select("id, title, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(6),
    admin
      .from("slatedrop_uploads")
      .select("id, filename, status, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(6),
    admin
      .from("slatedrop_uploads")
      .select("id, filename, status, created_at")
      .eq("org_id", orgId)
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("project_notifications")
      .select("id, message, severity, created_at")
      .eq("org_id", orgId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return {
    recentWalks: (walksRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
    })),
    recentDeliverables: (deliverablesRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
    })),
    recentSlateDrop: (recentDropRes.data ?? []).map((row) => ({
      id: row.id,
      filename: row.filename,
      status: row.status,
      createdAt: row.created_at,
    })),
    processingQueue: (processingRes.data ?? []).map((row) => ({
      id: row.id,
      filename: row.filename,
      status: row.status,
      createdAt: row.created_at,
    })),
    alerts: (alertsRes.data ?? []).map((row) => ({
      id: row.id,
      message: row.message,
      severity: row.severity,
      createdAt: row.created_at,
    })),
    assignments,
    hubSummary: hub.summary,
  };
}
