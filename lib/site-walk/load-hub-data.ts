import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  HubProject,
  HubSummary,
  HubWalk,
} from "@/lib/types/site-walk";

/* ------------------------------------------------------------------ */
/*  Shared read-only loader for Site Walk hub data.                    */
/*  Used by both the production /site-walk page and the                */
/*  /site-walk-v1-preview page.                                        */
/* ------------------------------------------------------------------ */

type SessionRow = {
  id: string;
  title: string;
  status: string;
  project_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  sync_state: string | null;
  metadata: Record<string, unknown> | null;
  projects?:
    | { name?: string | null }
    | Array<{ name?: string | null }>
    | null;
};

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

type CountRow = { session_id: string };
type ItemSignalRow = { item_status: string | null; sync_state: string | null };
type DeliverableSignalRow = { status: string | null };

const EMPTY: { projects: HubProject[]; walks: HubWalk[]; summary: HubSummary } = {
  projects: [],
  walks: [],
  summary: { openItems: 0, needsReview: 0, draftDeliverables: 0, unsyncedItems: 0 },
};

export async function loadSiteWalkHubData(
  orgId: string | null,
): Promise<{ projects: HubProject[]; walks: HubWalk[]; summary: HubSummary }> {
  if (!orgId) return EMPTY;

  const admin = createAdminClient();

  const [projectsResult, sessionsResult, itemsResult, deliverablesResult] =
    await Promise.all([
      admin
        .from("projects")
        .select("id, name, description, status, created_at")
        .eq("org_id", orgId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("site_walk_sessions")
        .select(
          "id, title, status, project_id, started_at, completed_at, created_at, updated_at, sync_state, metadata, projects(name)",
        )
        .eq("org_id", orgId)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(60),
      admin
        .from("site_walk_items")
        .select("item_status, sync_state")
        .eq("org_id", orgId)
        .limit(1000),
      admin
        .from("site_walk_deliverables")
        .select("status")
        .eq("org_id", orgId)
        .limit(500),
    ]);

  const sessionRows = (sessionsResult.data ?? []) as SessionRow[];

  const itemCounts = await loadItemCounts(
    admin,
    orgId,
    sessionRows.map((s) => s.id),
  );

  const itemSignals = (itemsResult.data ?? []) as ItemSignalRow[];
  const deliverableSignals = (deliverablesResult.data ?? []) as DeliverableSignalRow[];

  const projects: HubProject[] = ((projectsResult.data ?? []) as ProjectRow[]).map(
    (p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      createdAt: p.created_at,
    }),
  );

  const walks: HubWalk[] = sessionRows.map((s) => {
    const project = resolveProject(s.projects);
    return {
      id: s.id,
      title: s.title,
      status: s.status,
      projectId: s.project_id,
      projectName: project?.name ?? null,
      startedAt: s.started_at,
      completedAt: s.completed_at,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      itemCount: itemCounts.get(s.id) ?? 0,
      syncState: s.sync_state,
      isStarred: isStarred(s.metadata),
    };
  });

  const summary: HubSummary = {
    openItems: itemSignals.filter(
      (i) => i.item_status === "open" || i.item_status === "in_progress",
    ).length,
    needsReview:
      itemSignals.filter((i) => i.item_status === "resolved").length +
      deliverableSignals.filter((d) => d.status === "in_review").length,
    draftDeliverables: deliverableSignals.filter((d) => d.status === "draft")
      .length,
    unsyncedItems:
      itemSignals.filter((i) => i.sync_state && i.sync_state !== "synced")
        .length +
      sessionRows.filter((s) => s.sync_state && s.sync_state !== "synced")
        .length,
  };

  return { projects, walks, summary };
}

/* -- helpers -------------------------------------------------------- */

async function loadItemCounts(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  sessionIds: string[],
) {
  if (sessionIds.length === 0) return new Map<string, number>();
  const { data } = await admin
    .from("site_walk_items")
    .select("session_id")
    .eq("org_id", orgId)
    .in("session_id", sessionIds);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as CountRow[])
    counts.set(row.session_id, (counts.get(row.session_id) ?? 0) + 1);
  return counts;
}

function resolveProject(project: SessionRow["projects"]) {
  return Array.isArray(project) ? project[0] : project;
}

function isStarred(metadata: Record<string, unknown> | null) {
  return metadata?.starred === true || metadata?.is_starred === true;
}
