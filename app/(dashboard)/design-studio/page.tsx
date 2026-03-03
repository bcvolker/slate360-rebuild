import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import DesignStudioShell from "@/components/dashboard/DesignStudioShell";

export default async function DesignStudioPage() {
  const { user, tier, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/design-studio");

  return (
    <DesignStudioShell
      user={{
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar_url ?? undefined,
      }}
      tier={tier}
      isCeo={isSlateCeo}
    />
  );
}
