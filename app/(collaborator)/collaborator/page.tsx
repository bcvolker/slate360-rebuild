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
        <h1 className="text-2xl font-semibold text-foreground">Projects shared with you</h1>
        <p className="text-sm text-muted-foreground">
          You'll see every project where the owner has invited you as a collaborator.
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          You don't have any active project invites yet. Ask your project owner to resend the invite.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {projects.map((p) => (
            <li key={p.project_id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium text-foreground">{p.name ?? "Untitled project"}</div>
                <div className="text-xs text-muted-foreground">Project ID: {p.project_id}</div>
              </div>
              <Link
                href={`/projects/${p.project_id}`}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
