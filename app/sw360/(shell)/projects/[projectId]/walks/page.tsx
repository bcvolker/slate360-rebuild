import { loadProjectWalksTabData } from "@/lib/projects/load-project-walks-data";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { notFound } from "next/navigation";
import { SW360StartWalkButton } from "@/components/sw360/SW360StartWalkButton";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";
import Link from "next/link";

export default async function SW360ProjectWalksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const context = await resolveServerOrgContext();
  if (!context.user) notFound();
  const { project } = await getScopedProjectForUser(context.user.id, projectId, "id, name");
  if (!project) notFound();
  const p = project as unknown as { id: string; name: string };

  const { walks } = await loadProjectWalksTabData(projectId);

  return (
    <div className="flex flex-col gap-4">
      <SW360StartWalkButton projects={[{ id: p.id, name: p.name }]} />

      {walks.length === 0 ? (
        <p className="text-sm text-[var(--sw360-charcoal)]/60">No walks on this project yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {walks.map((w) => (
            <Link
              key={w.id}
              href={buildCaptureLaunchUrl({ session: w.id })}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3"
            >
              <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{w.title}</p>
              <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/50">
                {w.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
