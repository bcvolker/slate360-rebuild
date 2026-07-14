import { notFound } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { createAdminClient } from "@/lib/supabase/admin";
import SlateDropClient from "@/components/slatedrop/SlateDropClient";

/**
 * "Everything else" beyond drawings (contracts/specs/permits) — the
 * SlateDrop lens scoped to this project, reused directly rather than
 * rebuilt (SlateDrop is a KEEP-AS-IS subsystem per the pathmap).
 */
export default async function SW360ProjectDocsPage({
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

  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("full_name")
    .eq("id", context.user.id)
    .maybeSingle();

  return (
    <div className="h-[70vh] overflow-hidden rounded-2xl border border-[var(--border)]">
      <SlateDropClient
        user={{ name: profile?.full_name ?? "You", email: context.user.email ?? "" }}
        tier={context.tier}
        initialProjectId={p.id}
        projectName={p.name}
        embedded
      />
    </div>
  );
}
