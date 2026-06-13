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
import { MobileAppRootContent } from "@/components/studio-ui/MobileAppRootContent";

export const metadata = {
  title: "Slate360 — Home",
};

export default async function MobileAppRootPage() {
  const isMobile = await isMobileServerLayout();
  const { user, orgId } = await resolveServerOrgContext();

  if (!user) {
    redirect("/login");
  }

  if (!isMobile) {
    redirect("/dashboard");
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
  const launcherApps = buildMobileLauncherApps(entitlements, twinEntitlement, homeData);

  return (
    <Suspense fallback={null}>
      <MobileAppRootContent homeData={homeData} launcherApps={launcherApps} />
    </Suspense>
  );
}
