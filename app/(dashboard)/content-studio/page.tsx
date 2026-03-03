import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import ContentStudioShell from "@/components/dashboard/ContentStudioShell";

export default async function ContentStudioPage() {
  const { user, tier } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/content-studio");

  return (
    <ContentStudioShell
      user={{
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar_url ?? undefined,
      }}
      tier={tier}
    />
  );
}
