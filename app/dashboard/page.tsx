import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";
import type { Tier } from "@/lib/entitlements";

export const metadata = {
  title: "Dashboard — Slate360",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Attempt to resolve org tier
  let tier: Tier = "trial";
  try {
    const { data } = await supabase
      .from("organization_members")
      .select("organizations(tier)")
      .eq("user_id", user.id)
      .single();
    const org = data?.organizations as unknown;
    if (org && typeof org === "object" && !Array.isArray(org)) {
      const t = (org as { tier?: string }).tier;
      if (t) tier = t as Tier;
    }
  } catch {
    // No org found or table doesn't exist — default to trial
  }

  return (
    <DashboardClient
      user={{
        name:
          user.user_metadata?.full_name ??
          user.email?.split("@")[0] ??
          "User",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar_url ?? undefined,
      }}
      tier={tier}
    />
  );
}
