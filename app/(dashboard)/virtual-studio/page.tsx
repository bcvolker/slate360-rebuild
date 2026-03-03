import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import VirtualStudioShell from "@/components/dashboard/VirtualStudioShell";

export default async function VirtualStudioPage() {
  const { user, tier, isSlateCeo, hasInternalAccess } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/virtual-studio");

  return (
    <VirtualStudioShell
      user={{
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar_url ?? undefined,
      }}
      tier={tier}
      isCeo={hasInternalAccess}
    />
  );
}
