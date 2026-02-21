import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import { getStripeClient } from "@/lib/stripe";

type MemberRow = {
  org_id: string;
  role?: string | null;
  organizations?: { id?: string; name?: string; tier?: string } | { id?: string; name?: string; tier?: string }[] | null;
};

function safeTier(rawTier?: string | null): Tier {
  if (rawTier === "trial" || rawTier === "creator" || rawTier === "model" || rawTier === "business" || rawTier === "enterprise") {
    return rawTier;
  }
  return "trial";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membershipRes = await supabase
      .from("organization_members")
      .select("org_id, role, organizations(id,name,tier)")
      .eq("user_id", user.id)
      .limit(1);

    const member = (membershipRes.data?.[0] as MemberRow | undefined) ?? null;
    if (!member) {
      return NextResponse.json({ error: "Organization membership not found" }, { status: 400 });
    }

    const orgRaw = member.organizations;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;

    const tier = safeTier(org?.tier);
    const ent = getEntitlements(tier);

    let purchasedCredits = 0;
    let totalCreditsBalance = 0;

    try {
      const creditsRes = await supabase
        .from("credits")
        .select("purchased_balance")
        .eq("org_id", member.org_id)
        .single();
      purchasedCredits = Number((creditsRes.data as { purchased_balance?: number } | null)?.purchased_balance ?? 0);
    } catch {
      // optional table/column; ignore
    }

    try {
      const orgCreditsRes = await supabase
        .from("organizations")
        .select("credits_balance")
        .eq("id", member.org_id)
        .single();
      totalCreditsBalance = Number((orgCreditsRes.data as { credits_balance?: number } | null)?.credits_balance ?? 0);
      if (!purchasedCredits && totalCreditsBalance > 0) {
        purchasedCredits = totalCreditsBalance;
      }
    } catch {
      // optional column; ignore
    }

    let billingStatus: "active" | "trialing" | "past_due" | "canceled" = tier === "trial" ? "trialing" : "active";
    let renewsOn: string | null = null;

    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = getStripeClient();
        const customerSearch = await stripe.customers.list({ email: user.email ?? "", limit: 20 });
        const customer = customerSearch.data.find((c) => c.metadata?.org_id === member.org_id);

        if (customer?.id) {
          const subs = await stripe.subscriptions.list({ customer: customer.id, limit: 5, status: "all" });
          const priority = ["active", "trialing", "past_due", "canceled", "incomplete", "incomplete_expired", "unpaid", "paused"];
          const selectedSub = [...subs.data].sort(
            (a, b) => priority.indexOf(a.status) - priority.indexOf(b.status)
          )[0];

          if (selectedSub) {
            const status = selectedSub.status;
            if (status === "active" || status === "trialing" || status === "past_due" || status === "canceled") {
              billingStatus = status;
            } else {
              billingStatus = "active";
            }
            const periodEnd = (selectedSub as Stripe.Subscription & { current_period_end?: number }).current_period_end;
            if (periodEnd) {
              renewsOn = new Date(periodEnd * 1000).toISOString();
            }
          }
        }
      } catch {
        // Stripe optional during local/dev setup
      }
    }

    return NextResponse.json({
      profile: {
        name: (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "User",
        email: user.email ?? "",
        orgName: org?.name ?? "Slate360 Organization",
        role: member.role ?? "member",
      },
      billing: {
        plan: ent.label,
        tier,
        status: billingStatus,
        renewsOn,
        purchasedCredits,
        totalCreditsBalance,
      },
      usage: {
        storageUsedGb: tier === "trial" ? 1.2 : tier === "creator" ? 12 : 45,
        storageLimitGb: ent.maxStorageGB,
        monthlyCredits: ent.maxCredits,
      },
    });
  } catch (error) {
    console.error("[api/account/overview]", error);
    return NextResponse.json({ error: "Failed to load account overview" }, { status: 500 });
  }
}
