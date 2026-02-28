import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import { getStripeClient } from "@/lib/stripe";
import { resolveServerOrgContext } from "@/lib/server/org-context";

type ApiKeyRow = {
  id: string;
  label?: string | null;
  last_four?: string | null;
  created_at?: string | null;
};

type SessionRow = {
  id?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
};

type AuditRow = {
  id?: string | null;
  action?: string | null;
  actor?: string | null;
  created_at?: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await resolveServerOrgContext();
    const user = ctx.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tier: Tier = ctx.tier;
    const ent = getEntitlements(tier);
    const role = ctx.role ?? "member";
    const isAdmin = ctx.isAdmin;
    const orgId = ctx.orgId;

    let purchasedCredits = 0;
    let totalCreditsBalance = 0;
    let projectsCount = 0;
    let modelsCount = 0;
    let toursCount = 0;
    let docsCount = 0;

    const sessions: Array<{ id: string; device: string; ip: string; lastActive: string }> = [];
    const auditLog: Array<{ id: string; action: string; actor: string; createdAt: string }> = [];
    const apiKeys: Array<{ id: string; label: string; lastFour: string; createdAt: string }> = [];

    if (orgId) {
      try {
        const creditsRes = await supabase
          .from("credits")
          .select("purchased_balance")
          .eq("org_id", orgId)
          .single();
        purchasedCredits = Number((creditsRes.data as { purchased_balance?: number } | null)?.purchased_balance ?? 0);
      } catch {
        // optional table/column; ignore
      }

      try {
        const orgCreditsRes = await supabase
          .from("organizations")
          .select("credits_balance")
          .eq("id", orgId)
          .single();
        totalCreditsBalance = Number((orgCreditsRes.data as { credits_balance?: number } | null)?.credits_balance ?? 0);
        if (!purchasedCredits && totalCreditsBalance > 0) {
          purchasedCredits = totalCreditsBalance;
        }
      } catch {
        // optional column; ignore
      }
    }

    if (orgId) {
      try {
        const projectRes = await supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId);
        projectsCount = projectRes.count ?? 0;
      } catch {
        // optional table
      }
    }

    if (orgId) {
      try {
        const filesRes = await supabase
          .from("slatedrop_files")
          .select("id,file_type", { count: "exact" })
          .eq("org_id", orgId)
          .limit(1000);

        const files = filesRes.data as Array<{ file_type?: string | null }> | null;
        docsCount = filesRes.count ?? 0;
        if (files && files.length > 0) {
          modelsCount = files.filter((f) => ["glb", "obj", "stl", "fbx", "dwg"].includes(String(f.file_type ?? "").toLowerCase())).length;
          toursCount = files.filter((f) => ["jpg", "jpeg", "png"].includes(String(f.file_type ?? "").toLowerCase())).length;
        }
      } catch {
        // optional table
      }
    }

    try {
      const sessionRes = await supabase
        .from("login_audit")
        .select("id,ip,user_agent,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      const rows = (sessionRes.data as SessionRow[] | null) ?? [];
      rows.forEach((row, idx) => {
        sessions.push({
          id: row.id ?? `session-${idx}`,
          device: row.user_agent ? row.user_agent.slice(0, 40) : "Unknown device",
          ip: row.ip ?? "Unknown IP",
          lastActive: row.created_at ?? new Date().toISOString(),
        });
      });
    } catch {
      if (user.last_sign_in_at) {
        sessions.push({
          id: "current-session",
          device: "Current browser session",
          ip: "Current network",
          lastActive: user.last_sign_in_at,
        });
      }
    }

    if (isAdmin) {
      if (orgId) {
        try {
          const auditRes = await supabase
            .from("audit_log")
            .select("id,action,actor,created_at")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(5);

          const rows = (auditRes.data as AuditRow[] | null) ?? [];
          rows.forEach((row, idx) => {
            auditLog.push({
              id: row.id ?? `audit-${idx}`,
              action: row.action ?? "System event",
              actor: row.actor ?? "System",
              createdAt: row.created_at ?? new Date().toISOString(),
            });
          });
        } catch {
          auditLog.push({
            id: "audit-fallback-plan",
            action: "Plan details reviewed",
            actor: user.email ?? "Admin",
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (orgId) {
        try {
          const keyRes = await supabase
            .from("api_keys")
            .select("id,label,last_four,created_at")
            .eq("org_id", orgId)
            .is("revoked_at", null)
            .order("created_at", { ascending: false })
            .limit(10);

          const rows = (keyRes.data as ApiKeyRow[] | null) ?? [];
          rows.forEach((row, idx) => {
            apiKeys.push({
              id: row.id,
              label: row.label || `API Key ${idx + 1}`,
              lastFour: row.last_four || "••••",
              createdAt: row.created_at || new Date().toISOString(),
            });
          });
        } catch {
          // optional table
        }
      }
    }

    let billingStatus: "active" | "trialing" | "past_due" | "canceled" = tier === "trial" ? "trialing" : "active";
    let renewsOn: string | null = null;

    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = getStripeClient();
        const customerSearch = await stripe.customers.list({ email: user.email ?? "", limit: 20 });
        const customer = orgId
          ? customerSearch.data.find((c) => c.metadata?.org_id === orgId)
          : customerSearch.data[0];

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
        orgName: ctx.orgName ?? "Slate360 Organization",
        role,
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
        projectsCount,
        modelsCount,
        toursCount,
        docsCount,
      },
      sessions,
      auditLog,
      apiKeys,
      isAdmin,
    });
  } catch (error) {
    console.error("[api/account/overview]", error);
    return NextResponse.json({ error: "Failed to load account overview" }, { status: 500 });
  }
}
