import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MarketClient from "@/components/dashboard/MarketClient";
import type { Tier } from "@/lib/entitlements";

const CEO_EMAIL = "slate360ceo@gmail.com";

export const metadata = {
  title: "Market Robot — Slate360",
};

export default async function MarketPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // CEO-only gate
  if (user.email !== CEO_EMAIL) redirect("/dashboard");

  // Resolve org tier
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
    // default to trial
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MarketClient
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
      </div>
    </div>
  );
}
