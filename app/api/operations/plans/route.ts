import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, forbidden, serverError } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

interface PlanEntitlement {
  id: string;
  name: string;
  price: string;
  interval: string;
  activeOrgs: number;
  features: string[];
  entitlementsJson: string;
}

const PLAN_DEFS: Omit<PlanEntitlement, "activeOrgs">[] = [
  {
    id: "trial",
    name: "Trial / Beta",
    price: "$0",
    interval: "14 days",
    features: ["1 Active Project", "5 GB Storage", "Site Walk basic capture", "Community support"],
    entitlementsJson: JSON.stringify(
      { maxProjects: 1, storageGB: 5, standalone_punchwalk: true },
      null,
      2,
    ),
  },
  {
    id: "creator",
    name: "Site Walk Standalone",
    price: "$39",
    interval: "month",
    features: ["5 Active Projects", "50 GB Storage", "Full field capture & export", "Email support"],
    entitlementsJson: JSON.stringify(
      { maxProjects: 5, storageGB: 50, standalone_punchwalk: true },
      null,
      2,
    ),
  },
  {
    id: "model",
    name: "Slate360 Pro Bundle",
    price: "$88",
    interval: "month",
    features: [
      "15 Active Projects",
      "250 GB Storage",
      "360 Tour Builder included",
      "Priority support",
    ],
    entitlementsJson: JSON.stringify(
      {
        maxProjects: 15,
        storageGB: 250,
        standalone_punchwalk: true,
        standalone_tour_builder: true,
      },
      null,
      2,
    ),
  },
  {
    id: "business",
    name: "Business",
    price: "$249",
    interval: "month",
    features: ["Unlimited Projects", "1 TB Storage", "All standalone apps", "Dedicated support"],
    entitlementsJson: JSON.stringify(
      {
        maxProjects: -1,
        storageGB: 1024,
        standalone_punchwalk: true,
        standalone_tour_builder: true,
        standalone_design_studio: true,
        standalone_content_studio: true,
      },
      null,
      2,
    ),
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    interval: "year",
    features: ["Custom seats", "Custom storage", "SSO + audit log", "White-glove onboarding"],
    entitlementsJson: JSON.stringify(
      {
        maxProjects: -1,
        storageGB: -1,
        standalone_punchwalk: true,
        standalone_tour_builder: true,
        standalone_design_studio: true,
        standalone_content_studio: true,
        sso: true,
      },
      null,
      2,
    ),
  },
];

interface OrgTierRow {
  tier: string | null;
}

export const GET = (req: NextRequest) =>
  withAuth(req, async () => {
    const { canAccessOperationsConsole } = await resolveServerOrgContext();
    if (!canAccessOperationsConsole) return forbidden("Operations Console access required");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .select("tier")
      .returns<OrgTierRow[]>();

    if (error) {
      console.error("[/api/operations/plans] supabase error:", error);
      return serverError("Failed to load plan counts");
    }

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const tier = (row.tier ?? "trial").toLowerCase();
      counts.set(tier, (counts.get(tier) ?? 0) + 1);
    }

    const plans: PlanEntitlement[] = PLAN_DEFS.map((p) => ({
      ...p,
      activeOrgs: counts.get(p.id) ?? 0,
    }));

    return ok({ plans });
  });
