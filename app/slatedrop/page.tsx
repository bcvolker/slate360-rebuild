import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SlateDropClient from "@/components/slatedrop/SlateDropClient";
import type { Tier } from "@/lib/entitlements";

export const metadata = {
  title: "SlateDrop — Slate360",
};

export default async function SlateDropPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/slatedrop");

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
    // default trial
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
    />
  );
}
