import { Lock, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import type { Tier } from "@/lib/entitlements";
import { getEntitlements } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import AnalyticsReportsClient from "@/components/dashboard/AnalyticsReportsClient";

export const metadata = {
  title: "Analytics & Reports — Slate360",
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

export default async function AnalyticsPage() {
  const { tier, userExists } = await resolveTier();
  if (!userExists) redirect("/login");

  const entitlements = getEntitlements(tier);
  if (!entitlements.canAccessReports) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center bg-[#0B1220] px-6 py-12 text-slate-100">
        <section className="w-full rounded-2xl border border-slate-800 bg-[#121A2B] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#1E3A8A]/30">
            <Lock className="h-6 w-6 text-[#FF6B35]" />
          </div>
          <h1 className="text-2xl font-black text-white">Upgrade Required</h1>
          <p className="mt-2 text-sm text-slate-300">Your current plan does not include Analytics & Reports access.</p>
          <a
            href="/plans"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E25D2E]"
          >
            <TrendingUp size={16} /> View Upgrade Options
          </a>
        </section>
      </main>
    );
  }

  return <AnalyticsReportsClient tierLabel={entitlements.label} />;
}
