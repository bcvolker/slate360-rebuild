import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { DashboardV2Shell } from "@/components/dashboard-v2/DashboardV2Shell";

export const metadata = {
  title: "Slate360 — Home (V2 Preview)",
};

/**
 * Dashboard V2 — parallel preview route.
 *
 * This is a sandboxed preview that does NOT affect production /dashboard.
 * Production /dashboard continues to serve WalledGardenDashboard → CommandCenterContent.
 *
 * Swap plan: when V2 is approved, replace the contents of
 * app/(dashboard)/dashboard/page.tsx with this pattern and delete this file.
 *
 * Slice 1: App Launcher + Quick Actions only.
 * Slice 2: Activity Panel (real data wired from project_notifications + site_walk_assignments).
 */
export default async function DashboardV2PreviewPage() {
  const { user, orgId, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  const entitlements = await resolveOrgEntitlements(orgId ?? null);

  return <DashboardV2Shell entitlements={entitlements} isSlateCeo={isSlateCeo} />;
}
