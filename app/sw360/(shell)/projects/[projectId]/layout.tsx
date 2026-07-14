import { notFound } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { SW360BackHeader } from "@/components/sw360/SW360BackHeader";
import { SW360ProjectTabBar } from "@/components/sw360/SW360ProjectTabBar";

type ProjectRow = { id: string; name: string; description: string | null };

/**
 * Shared header + tab bar for every project sub-screen (Walks/Plans/Docs/
 * Team/Reports) — replaces the old single flat project detail page. Each
 * tab page owns its own data loading; this layout only resolves the
 * project's identity once for the header.
 */
export default async function SW360ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const context = await resolveServerOrgContext();
  if (!context.user) notFound();

  const { project, error } = await getScopedProjectForUser(context.user.id, projectId, "id, name, description");
  if (error || !project) notFound();
  const p = project as unknown as ProjectRow;

  return (
    <div className="flex flex-col gap-3 px-4 py-6">
      <SW360BackHeader href="/sw360/projects" label="Projects" />
      <div>
        <h1 className="text-xl font-black tracking-tight text-[var(--sw360-charcoal)]">{p.name}</h1>
        {p.description ? (
          <p className="mt-0.5 text-sm text-[var(--sw360-charcoal)]/60">{p.description}</p>
        ) : null}
      </div>
      <SW360ProjectTabBar projectId={projectId} />
      <div className="pt-1">{children}</div>
    </div>
  );
}
