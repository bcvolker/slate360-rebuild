import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getScopedProjectForUser } from "@/lib/projects/access";
import SlateDropClient from "@/components/slatedrop/SlateDropClient";

export default async function ProjectSlateDropPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const { user, tier } = await resolveServerOrgContext();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}/slatedrop`)}`);
  }

  const { project } = await getScopedProjectForUser(user.id, projectId, "id, name");

  if (!project) {
    notFound();
  }

  return (
    <SlateDropClient
      user={{
        name:
          user.user_metadata?.full_name ??
          user.email?.split("@")[0] ??
          "User",
        email: user.email ?? "",
      }}
      tier={tier}
      initialProjectId={projectId}
    />
  );
}
