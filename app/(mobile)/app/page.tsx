import { Suspense } from "react";
import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";
import { isMobileServerLayout } from "@/lib/server/device-layout";
import { loadMobileAppHomeData } from "@/lib/mobile/load-app-home-data";
import { buildMobileLauncherApps } from "@/lib/mobile/mobile-launcher-apps";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDigitalTwinEntitlement } from "@/lib/twin/processing-entitlement";
import { loadSpatialWalkthroughEnabled, resolveClientSurfaceFlags } from "@/lib/spatial-walkthrough/access";
import { isSpatialOnlyPortal, launcherTileAllowed, portalHomeHref } from "@/lib/spatial-walkthrough/client-surface";
import { MobileAppRootContent } from "@/components/studio-ui/MobileAppRootContent";

export const metadata = {
  title: "Slate360 — Home",
};

export default async function MobileAppRootPage() {
  const isMobile = await isMobileServerLayout();
  const { user, orgId, isSlateCeo } = await resolveServerOrgContext();

  if (!user) {
    redirect("/login");
  }

  const flags = await resolveClientSurfaceFlags(orgId, Boolean(isSlateCeo));
  if (!isMobile) {
    redirect(portalHomeHref(flags));
  }

  if (!orgId) {
    try {
      await ensureUserOrganization(user);
    } catch (error) {
      console.error("[app] org bootstrap fallback failed", error);
    }
  }

  const activeOrgId = orgId ?? (await resolveServerOrgContext()).orgId;
  const homeData = await loadMobileAppHomeData(activeOrgId, user.id);
  const entitlements = await resolveOrgEntitlements(activeOrgId);
  const admin = createAdminClient();
  const twinEntitlement = await resolveDigitalTwinEntitlement(admin, {
    userId: user.id,
    userEmail: user.email,
    orgId: activeOrgId,
  });
  const spatialWalkthrough = await loadSpatialWalkthroughEnabled(activeOrgId);
  const launcherApps = buildMobileLauncherApps(
    entitlements,
    twinEntitlement,
    homeData,
    Boolean(isSlateCeo),
    Boolean(isSlateCeo) || spatialWalkthrough,
  ).filter((app) => launcherTileAllowed(app.id, flags));

  let projectCount = 0;
  if (activeOrgId) {
    const { count } = await admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("org_id", activeOrgId);
    projectCount = count ?? 0;
  }

  return (
    <Suspense fallback={null}>
      <MobileAppRootContent
        homeData={homeData}
        launcherApps={launcherApps}
        spatialOnly={isSpatialOnlyPortal(flags)}
        projectCount={projectCount}
      />
    </Suspense>
  );
}
