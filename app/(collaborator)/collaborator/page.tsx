import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { listCollaboratorProjects } from "@/lib/server/collaborator-mode";

export default async function CollaboratorHomePage() {
  const { user } = await resolveServerOrgContext();
  if (!user) return null;

  const projects = await listCollaboratorProjects(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--graphite-text-header)]">
          Projects shared with you
        </h1>
        <p className="text-sm text-[var(--graphite-muted)]">
          You'll see every project where the owner has invited you as a collaborator.
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--mobile-app-card-border)] p-8 text-center text-sm text-[var(--graphite-muted)]">
          You don't have any active project invites yet. Ask your project owner to resend the invite.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--mobile-app-card-border)] overflow-hidden rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] backdrop-blur-md">
          {projects.map((p) => (
            <li key={p.project_id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="truncate font-medium text-[var(--graphite-text-header)]">
                  {p.name ?? "Untitled project"}
                </div>
                <div className="truncate text-xs text-[var(--graphite-muted)]">
                  Project ID: {p.project_id}
                </div>
              </div>
              <Link
                href={`/projects/${p.project_id}`}
                className="inline-flex min-h-10 shrink-0 items-center rounded-xl bg-[var(--graphite-primary)] px-3.5 text-sm font-semibold text-[var(--graphite-canvas)] transition-opacity hover:opacity-90"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
