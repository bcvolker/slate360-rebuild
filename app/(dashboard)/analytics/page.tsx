import { Lock, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import { getEntitlements } from "@/lib/entitlements";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getUpgradeUrl } from "@/lib/billing";
import AnalyticsReportsClient from "@/components/dashboard/AnalyticsReportsClient";

export const metadata = {
  title: "Analytics & Reports — Slate360",
};

export default async function AnalyticsPage() {
  const { user, tier, isSlateCeo, canAccessCeo, canAccessMarket, canAccessAthlete360 } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  const entitlements = getEntitlements(tier, { isSlateCeo });
  if (!entitlements.canAccessReports) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center bg-[#ECEEF2] px-6 py-12">
        <section className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#FF4D00]/10">
            <Lock className="h-6 w-6 text-[#FF4D00]" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Upgrade Required</h1>
          <p className="mt-2 text-sm text-gray-500">Your current plan does not include Analytics & Reports access.</p>
          <a
            href={getUpgradeUrl()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500]"
          >
            <TrendingUp size={16} /> View Upgrade Options
          </a>
        </section>
      </main>
    );
  }

  return (
    <AnalyticsReportsClient
      user={{
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar_url,
      }}
      tier={tier}
      isCeo={isSlateCeo}
      internalAccess={{ ceo: canAccessCeo, market: canAccessMarket, athlete360: canAccessAthlete360 }}
    />
  );
}
