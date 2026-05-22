import { getEntitlements, resolveModularEntitlements } from "@/lib/entitlements";
import type { OrgAppSubscriptions } from "@/lib/entitlements";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteWalkSetupClient } from "./_components/SiteWalkSetupClient";
import type { BrandSettings, ReportDefaults, SetupContact, SetupProject, SiteWalkSetupTier } from "./_components/setup-types";

type SubscriptionRow = {
  site_walk?: OrgAppSubscriptions["site_walk"] | null;
  tours?: OrgAppSubscriptions["tours"] | null;
  slatedrop?: OrgAppSubscriptions["slatedrop"] | null;
  design_studio?: OrgAppSubscriptions["design_studio"] | null;
  content_studio?: OrgAppSubscriptions["content_studio"] | null;
  bundle?: OrgAppSubscriptions["bundle"] | null;
  storage_addon_gb?: number | null;
  credit_addon_balance?: number | null;
};

export default async function SiteWalkSetupPage() {
  const context = await resolveServerOrgContext();

  if (!context.user || !context.orgId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-md">
          <h1 className="text-2xl font-black text-white">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-300">Site Walk setup needs an organization workspace.</p>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const [orgResult, projectsResult, contactsResult, subscriptionsResult] = await Promise.all([
    admin.from("organizations").select("brand_settings").eq("id", context.orgId).maybeSingle(),
    admin.from("projects").select("id, name, description, metadata, status, created_at").eq("org_id", context.orgId).eq("status", "active").eq("project_type", "field").order("created_at", { ascending: false }).limit(25),
    admin.from("org_contacts").select("id, name, email, phone, company, title, initials, color").eq("org_id", context.orgId).eq("is_archived", false).order("name").limit(50),
    admin.from("org_app_subscriptions").select("site_walk, tours, slatedrop, design_studio, content_studio, bundle, storage_addon_gb, credit_addon_balance").eq("org_id", context.orgId).maybeSingle<SubscriptionRow>(),
  ]);

  const projects = (projectsResult.data ?? []) as SetupProject[];
  const firstProjectId = projects[0]?.id ?? null;
  const defaults = firstProjectId ? await loadReportDefaults(admin, firstProjectId) : {};
  const tier = resolveSetupTier(context.tier, context.isSlateCeo, subscriptionsResult.data ?? null);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-slate-100">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] no-scrollbar sm:px-6 lg:px-8">
        <SiteWalkSetupClient
          brandSettings={(orgResult.data?.brand_settings ?? {}) as BrandSettings}
          contacts={(contactsResult.data ?? []) as SetupContact[]}
          initialReportDefaults={defaults}
          orgName={context.orgName ?? "your organization"}
          projects={projects}
          tier={tier}
        />
      </div>
    </div>
  );
}

async function loadReportDefaults(admin: ReturnType<typeof createAdminClient>, projectId: string): Promise<ReportDefaults> {
  const { data } = await admin.from("projects").select("report_defaults").eq("id", projectId).maybeSingle();
  return (data?.report_defaults ?? {}) as ReportDefaults;
}

function resolveSetupTier(rawTier: string, isSlateCeo: boolean, row: SubscriptionRow | null): SiteWalkSetupTier {
  const entitlements = getEntitlements(rawTier, { isSlateCeo });
  if (entitlements.tier === "business" || entitlements.tier === "enterprise") return "business";
  const modular = resolveModularEntitlements(row ? {
    site_walk: row.site_walk ?? "none",
    tours: row.tours ?? "none",
    slatedrop: row.slatedrop ?? "none",
    design_studio: row.design_studio ?? "none",
    content_studio: row.content_studio ?? "none",
    bundle: row.bundle ?? null,
    storageAddonGB: row.storage_addon_gb ?? 0,
    creditAddonBalance: row.credit_addon_balance ?? 0,
  } : null);
  return modular.apps.site_walk.tier === "pro" ? "pro" : "basic";
}
