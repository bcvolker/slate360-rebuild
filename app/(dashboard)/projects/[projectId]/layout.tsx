import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveServerOrgContext } from "@/lib/server/org-context";

const OVERVIEW_TAB = { label: "Overview", href: "" } as const;

export default async function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user } = await resolveServerOrgContext();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${projectId}`)}`);
  }

  const { project: scopedProject } = await getScopedProjectForUser(user.id, projectId, "id, name, status");
  const project = scopedProject as { id: string; name: string; status: string } | null;

  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-4 border-b border-[var(--mobile-app-card-border)] pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
              Project
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--graphite-text-header)]">
              {project.name}
            </h1>
          </div>
          <span className="inline-flex rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--graphite-text-body)]">
            {project.status}
          </span>
        </div>

        <nav aria-label="Project sections">
          <ul className="flex items-center gap-2">
            <li>
              <Link
                href={`/projects/${projectId}`}
                className="inline-flex rounded-lg border border-[color-mix(in_srgb,var(--graphite-primary)_32%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] px-3 py-1.5 text-sm font-semibold text-[var(--graphite-text-header)]"
                aria-current="page"
              >
                {OVERVIEW_TAB.label}
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <div>{children}</div>
    </div>
  );
}
