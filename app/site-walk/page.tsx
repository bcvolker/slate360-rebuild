import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteWalkHub } from "./_components/SiteWalkHub";
import type { HubProject, HubSummary, HubWalk } from "./_components/siteWalkHubTypes";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

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
  projects?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type CountRow = { session_id: string };
type ItemSignalRow = { item_status: string | null; sync_state: string | null };
type DeliverableSignalRow = { status: string | null };

const EMPTY_SUMMARY: HubSummary = { openItems: 0, needsReview: 0, draftDeliverables: 0, unsyncedItems: 0 };

export default async function SiteWalkPage() {
  const context = await resolveServerOrgContext();
  const { projects, walks, summary } = context.orgId ? await loadHubData(context.orgId) : { projects: [], walks: [], summary: EMPTY_SUMMARY };

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.07),transparent_34%),#0B0F15] px-3 py-3 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1">
        <SiteWalkHub projects={projects} walks={walks} summary={summary} orgName={context.orgName} />
      </div>
    </main>
  );
}

async function loadHubData(orgId: string): Promise<{ projects: HubProject[]; walks: HubWalk[]; summary: HubSummary }> {
  const admin = createAdminClient();
  const [projectsResult, sessionsResult, itemsResult, deliverablesResult] = await Promise.all([
    admin.from("projects").select("id, name, description, status, created_at").eq("org_id", orgId).eq("status", "active").order("created_at", { ascending: false }).limit(50),
    admin.from("site_walk_sessions").select("id, title, status, project_id, started_at, completed_at, created_at, updated_at, sync_state, metadata, projects(name)").eq("org_id", orgId).neq("status", "archived").order("updated_at", { ascending: false }).limit(60),
    admin.from("site_walk_items").select("item_status, sync_state").eq("org_id", orgId).limit(1000),
    admin.from("site_walk_deliverables").select("status").eq("org_id", orgId).limit(500),
  ]);
  const sessionRows = (sessionsResult.data ?? []) as SessionRow[];
  const itemCounts = await loadItemCounts(orgId, sessionRows.map((session) => session.id));
  const itemSignals = (itemsResult.data ?? []) as ItemSignalRow[];
  const deliverableSignals = (deliverablesResult.data ?? []) as DeliverableSignalRow[];
  const projects = ((projectsResult.data ?? []) as ProjectRow[]).map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    createdAt: project.created_at,
  }));
  const walks = sessionRows.map((session) => {
    const project = resolveProject(session.projects);
    return {
      id: session.id,
      title: session.title,
      status: session.status,
      projectId: session.project_id,
      projectName: project?.name ?? null,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      itemCount: itemCounts.get(session.id) ?? 0,
      syncState: session.sync_state,
      isStarred: isStarred(session.metadata),
    };
  });
  const summary: HubSummary = {
    openItems: itemSignals.filter((item) => item.item_status === "open" || item.item_status === "in_progress").length,
    needsReview: itemSignals.filter((item) => item.item_status === "resolved").length + deliverableSignals.filter((deliverable) => deliverable.status === "in_review").length,
    draftDeliverables: deliverableSignals.filter((deliverable) => deliverable.status === "draft").length,
    unsyncedItems: itemSignals.filter((item) => item.sync_state && item.sync_state !== "synced").length + sessionRows.filter((session) => session.sync_state && session.sync_state !== "synced").length,
  };
  return { projects, walks, summary };
}

async function loadItemCounts(orgId: string, sessionIds: string[]) {
  if (sessionIds.length === 0) return new Map<string, number>();
  const admin = createAdminClient();
  const { data } = await admin.from("site_walk_items").select("session_id").eq("org_id", orgId).in("session_id", sessionIds);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as CountRow[]) counts.set(row.session_id, (counts.get(row.session_id) ?? 0) + 1);
  return counts;
}

function resolveProject(project: SessionRow["projects"]) {
  return Array.isArray(project) ? project[0] : project;
}

function isStarred(metadata: Record<string, unknown> | null) {
  return metadata?.starred === true || metadata?.is_starred === true;
}
