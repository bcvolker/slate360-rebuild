import { notFound } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { SW360StartWalkButton } from "@/components/sw360/SW360StartWalkButton";
import { SW360BackHeader } from "@/components/sw360/SW360BackHeader";
import { SW360DeleteProjectButton } from "@/components/sw360/SW360DeleteProjectButton";

type ProjectRow = { id: string; name: string; description: string | null };
type WalkRow = { id: string; title: string | null; status: string; created_at: string };

/**
 * Minimal real project detail — name, description, walk history, start-a-walk
 * scoped to this project. The full 5-tab detail (Walks/Plans/Docs/Team/Reports
 * per the lock sheet) is later B2 work; this exists now so Projects-list and
 * Home's project cards have somewhere real to land instead of a 404.
 */
export default async function SW360ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const context = await resolveServerOrgContext();
  if (!context.user) notFound();

  const { admin, project, error } = await getScopedProjectForUser(
    context.user.id,
    projectId,
    "id, name, description",
  );
  if (error || !project) notFound();
  const p = project as unknown as ProjectRow;

  const { data: walkRows } = await admin
    .from("site_walk_sessions")
    .select("id, title, status, created_at")
    .eq("project_id", projectId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(20);
  const walks = (walkRows ?? []) as WalkRow[];

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <SW360BackHeader href="/sw360/projects" label="Projects" />

      <div>
        <h1 className="text-xl font-black tracking-tight text-[var(--sw360-charcoal)]">{p.name}</h1>
        {p.description ? (
          <p className="mt-0.5 text-sm text-[var(--sw360-charcoal)]/60">{p.description}</p>
        ) : null}
      </div>

      <SW360StartWalkButton projects={[{ id: p.id, name: p.name }]} />

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
          Walk history
        </p>
        {walks.length === 0 ? (
          <p className="text-sm text-[var(--sw360-charcoal)]/60">No walks on this project yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {walks.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3"
              >
                <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">
                  {w.title || "Untitled walk"}
                </p>
                <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/50">
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-[var(--border)] pt-4">
        <SW360DeleteProjectButton projectId={p.id} projectName={p.name} />
      </div>
    </div>
  );
}
