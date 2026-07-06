import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { mobileTokens } from "@/components/mobile-system";
import { cn } from "@/lib/utils";
import { getEntitlements } from "@/lib/entitlements";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { BillingPortalLink } from "./BillingPortalLink";

export const metadata = { title: "Billing — Slate360" };

/**
 * C3: fixes the dead /more/billing 404 (MobileAppLauncherUpsellSheet linked
 * here but no mobile route existed). Read-only plan + credit balance for
 * everyone; the Stripe billing-portal link only renders on web (see
 * BillingPortalLink) — native purchase surfaces never reach Stripe.
 */
export default async function MoreBillingPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/more/billing");

  const entitlements = getEntitlements(ctx.tier, { isSlateCeo: ctx.isSlateCeo });

  let creditsBalance = 0;
  if (ctx.orgId) {
    const admin = createAdminClient();
    const { data: org } = await admin
      .from("organizations")
      .select("credits_balance")
      .eq("id", ctx.orgId)
      .maybeSingle();
    creditsBalance = org?.credits_balance ?? 0;
  }

  return (
    <div className={mobileTokens.mobilePageScrollInner}>
      <section className={cn(mobileTokens.panelBase, "p-5")}>
        <span className={cn(mobileTokens.mobileIconWell, "h-12 w-12")} aria-hidden>
          <CreditCard className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className={cn("mt-4", mobileTokens.mobileEyebrowLabel)}>Subscription</p>
        <h1 className={cn("mt-2", mobileTokens.moduleTitle)}>Billing</h1>
        <p className={mobileTokens.moduleSubtitle}>Your plan and current credit balance.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <MetricTile label="Plan" value={entitlements.label} />
          <MetricTile label="Credits" value={creditsBalance.toLocaleString()} />
        </div>
      </section>

      <BillingPortalLink />
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(mobileTokens.mobileGlassCardSurface, "px-3 py-2")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-zinc-100">{value}</p>
    </div>
  );
}
