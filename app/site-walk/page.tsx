import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteWalkHub, type HubProject, type HubWalk } from "./_components/SiteWalkHub";

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
  metadata: Record<string, unknown> | null;
  projects?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type CountRow = { session_id: string };

export default async function SiteWalkPage() {
  const context = await resolveServerOrgContext();
  const { projects, walks } = context.orgId ? await loadHubData(context.orgId) : { projects: [], walks: [] };

  return (
    <main className="min-h-[calc(100dvh-96px)] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.07),transparent_34%),#0B0F15] px-3 py-3 pb-24 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-full max-w-6xl items-start">
        <SiteWalkHub projects={projects} walks={walks} />
      </div>
    </main>
  );
}

async function loadHubData(orgId: string): Promise<{ projects: HubProject[]; walks: HubWalk[] }> {
  const admin = createAdminClient();
  const [projectsResult, sessionsResult] = await Promise.all([
    admin.from("projects").select("id, name, description, status, created_at").eq("org_id", orgId).eq("status", "active").order("created_at", { ascending: false }).limit(50),
    admin.from("site_walk_sessions").select("id, title, status, project_id, started_at, completed_at, created_at, updated_at, metadata, projects(name)").eq("org_id", orgId).neq("status", "archived").order("updated_at", { ascending: false }).limit(60),
  ]);
  const sessionRows = (sessionsResult.data ?? []) as SessionRow[];
  const itemCounts = await loadItemCounts(orgId, sessionRows.map((session) => session.id));
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
      isStarred: isStarred(session.metadata),
    };
  });
  return { projects, walks };
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
