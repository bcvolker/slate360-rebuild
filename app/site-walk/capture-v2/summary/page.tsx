import { notFound } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import { CaptureV2Summary } from "@/components/capture-v2/CaptureV2Summary";
import { computeCaptureV2SummaryStats } from "@/components/capture-v2/capture-v2-summary-stats";
import type {
  CaptureV2SummaryItem,
  CaptureV2SummarySession,
} from "@/components/capture-v2/capture-v2-summary-types";
import type { ItemPriority, ItemStatus } from "@/lib/types/site-walk-core";
import type { SiteWalkItemType, SiteWalkSyncState, SiteWalkUploadState } from "@/lib/types/site-walk";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ session?: string; finished?: string; saved?: string }>;
};

type SessionRow = {
  id: string;
  title: string;
  status: string;
  project_id: string | null;
  is_ad_hoc: boolean;
  last_synced_at: string | null;
  completed_at: string | null;
  projects?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type ItemRow = {
  id: string;
  item_type: SiteWalkItemType;
  title: string;
  description: string | null;
  item_status: ItemStatus;
  priority: ItemPriority;
  category: string | null;
  trade: string | null;
  sync_state: SiteWalkSyncState;
  upload_state: SiteWalkUploadState;
  created_at: string;
  updated_at: string;
};

export default async function CaptureV2SummaryPage({ searchParams }: Props) {
  const { session: sessionId, finished, saved } = await searchParams;
  const justFinished = finished === "1";
  const savedCount = saved ? Number.parseInt(saved, 10) : null;
  const context = await resolveServerOrgContext();

  if (!context.user || !context.orgId || !sessionId) {
    return notFound();
  }

  const admin = createAdminClient();
  let itemsQuery = admin
    .from("site_walk_items")
    .select(
      "id, item_type, title, description, item_status, priority, category, trade, sync_state, upload_state, created_at, updated_at",
    )
    .eq("session_id", sessionId)
    .eq("org_id", context.orgId);
  itemsQuery = excludeDeletedSiteWalkItems(itemsQuery);

  const [{ data: sessionRow }, { data: itemRows }] = await Promise.all([
    admin
      .from("site_walk_sessions")
      .select("id, title, status, project_id, is_ad_hoc, last_synced_at, completed_at, projects(name)")
      .eq("id", sessionId)
      .eq("org_id", context.orgId)
      .maybeSingle<SessionRow>(),
    itemsQuery.order("created_at", { ascending: true }),
  ]);

  if (!sessionRow) return notFound();

  const project = Array.isArray(sessionRow.projects) ? sessionRow.projects[0] : sessionRow.projects;
  const items = mapSummaryItems((itemRows ?? []) as ItemRow[]);

  const session: CaptureV2SummarySession = {
    id: sessionRow.id,
    title: sessionRow.title,
    status: sessionRow.status,
    projectId: sessionRow.project_id,
    projectName: project?.name ?? null,
    isAdHoc: sessionRow.is_ad_hoc,
    lastSyncedAt: sessionRow.last_synced_at,
    completedAt: sessionRow.completed_at,
  };

  const stats = computeCaptureV2SummaryStats(items, session.lastSyncedAt);

  return (
    <CaptureV2Summary
      session={session}
      items={items}
      stats={stats}
      justFinished={justFinished}
      savedCount={Number.isFinite(savedCount) ? savedCount : null}
    />
  );
}

function mapSummaryItems(rows: ItemRow[]): CaptureV2SummaryItem[] {
  return rows.map((row) => ({
    id: row.id,
    itemType: row.item_type,
    title: row.title,
    description: row.description,
    itemStatus: row.item_status,
    priority: row.priority,
    classification: row.category,
    trade: row.trade,
    syncState: row.sync_state,
    uploadState: row.upload_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
