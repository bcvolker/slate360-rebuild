import { notFound } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import { loadSiteWalkHubData } from "@/lib/site-walk/load-hub-data";
import { CaptureV2Summary } from "@/components/capture-v2/CaptureV2Summary";
import type {
  CaptureV2SummaryItem,
  CaptureV2SummarySession,
} from "@/components/capture-v2/capture-v2-summary-types";
import type { ItemPriority, ItemStatus } from "@/lib/types/site-walk-core";
import type { SiteWalkItemType, SiteWalkSyncState, SiteWalkUploadState } from "@/lib/types/site-walk";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ session?: string }>;
};

type SessionRow = {
  id: string;
  title: string;
  status: string;
  project_id: string | null;
  is_ad_hoc: boolean;
  last_synced_at: string | null;
  completed_at: string | null;
  started_at: string | null;
  metadata: Record<string, unknown> | null;
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
  location_label: string | null;
  before_item_id: string | null;
  metadata: Record<string, unknown> | null;
};

export default async function CaptureV2SummaryPage({ searchParams }: Props) {
  const { session: sessionId } = await searchParams;
  const context = await resolveServerOrgContext();

  if (!context.user || !context.orgId || !sessionId) {
    return notFound();
  }

  const admin = createAdminClient();
  let itemsQuery = admin
    .from("site_walk_items")
    .select(
      "id, item_type, title, description, item_status, priority, category, trade, sync_state, upload_state, created_at, updated_at, location_label, before_item_id, metadata",
    )
    .eq("session_id", sessionId)
    .eq("org_id", context.orgId);
  itemsQuery = excludeDeletedSiteWalkItems(itemsQuery);

  const [{ data: sessionRow }, { data: itemRows }, hubData] = await Promise.all([
    admin
      .from("site_walk_sessions")
      .select(
        "id, title, status, project_id, is_ad_hoc, last_synced_at, completed_at, started_at, metadata, projects(name)",
      )
      .eq("id", sessionId)
      .eq("org_id", context.orgId)
      .maybeSingle<SessionRow>(),
    itemsQuery.order("created_at", { ascending: true }),
    loadSiteWalkHubData(context.orgId),
  ]);

  if (!sessionRow) return notFound();

  const project = Array.isArray(sessionRow.projects) ? sessionRow.projects[0] : sessionRow.projects;
  const items = mapSummaryItems((itemRows ?? []) as ItemRow[]);
  const worksiteLabel = readWorksiteLabel(sessionRow.metadata);

  const session: CaptureV2SummarySession = {
    id: sessionRow.id,
    title: sessionRow.title,
    status: sessionRow.status,
    projectId: sessionRow.project_id,
    projectName: project?.name ?? null,
    isAdHoc: sessionRow.is_ad_hoc,
    lastSyncedAt: sessionRow.last_synced_at,
    completedAt: sessionRow.completed_at,
    startedAt: sessionRow.started_at,
    worksiteLabel,
  };

  return (
    <CaptureV2Summary session={session} items={items} projects={hubData.projects} />
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
    locationLabel: row.location_label,
    beforeItemId: row.before_item_id,
    metadata: row.metadata,
  }));
}

function readWorksiteLabel(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const level = metadata.level_label ?? metadata.worksite_label ?? metadata.location_label;
  return typeof level === "string" && level.trim() ? level.trim() : null;
}
