import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { isCollaboratorOnly } from "@/lib/server/collaborator-mode";
import { CollaboratorShell } from "@/components/collaborator/CollaboratorShell";

export default async function CollaboratorRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/collaborator");

  const isCollab = await isCollaboratorOnly(user.id);
  if (!isCollab) {
    // User has their own org/subscription — send them to the full dashboard.
    redirect("/dashboard");
  }

  return (
    <CollaboratorShell
      user={{
        name:
          (typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null) ??
          user.email?.split("@")[0] ??
          "Collaborator",
        email: user.email ?? "",
      }}
    >
      {children}
    </CollaboratorShell>
  );
}
