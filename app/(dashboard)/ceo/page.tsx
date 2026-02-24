import { notFound, redirect } from "next/navigation";
import type { Tier } from "@/lib/entitlements";
import { getEntitlements } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import CeoCommandCenterClient from "@/components/dashboard/CeoCommandCenterClient";

export const metadata = {
  title: "CEO Command Center — Slate360",
};

async function resolveTier(): Promise<{ tier: Tier; userExists: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { tier: "trial", userExists: false };

  let tier: Tier = "trial";
  try {
    const { data } = await supabase
      .from("organization_members")
      .select("organizations(tier)")
      .eq("user_id", user.id)
      .single();

    const org = data?.organizations as unknown;
    if (org && typeof org === "object" && !Array.isArray(org)) {
      const maybeTier = (org as { tier?: string }).tier;
      if (maybeTier) tier = maybeTier as Tier;
    }
  } catch {
    // fallback to trial tier
  }

  return { tier, userExists: true };
}

export default async function CeoPage() {
  const { tier, userExists } = await resolveTier();
  if (!userExists) redirect("/login");

  const entitlements = getEntitlements(tier);
  if (!entitlements.canAccessCeo) {
    notFound();
  }

  return <CeoCommandCenterClient />;
}
