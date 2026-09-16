import { redirect } from "next/navigation";
import ProjectsClientPage from "./ClientPage";
import { MobileProjectsClient } from "@/components/mobile-system/MobileProjectsClient";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { isMobileServerLayout } from "@/lib/server/device-layout";
import { resolveClientSurfaceFlags } from "@/lib/spatial-walkthrough/access";
import { isSpatialOnlyPortal, portalHomeHref } from "@/lib/spatial-walkthrough/client-surface";

export const metadata = {
  title: "Projects — Slate360",
};

// Single /projects route. Next.js route groups don't change the URL, so this
// page cannot also exist under (mobile) — it renders the mobile or desktop
// client based on device, the same way the surrounding layouts adapt chrome.
export default async function ProjectsPage() {
  const { user, orgId, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/projects");

  // Spatial-only clients get their own hero-carousel home (docs/design/
  // CLIENT_ACCOUNT_HOME_2026-09.md) — bounce any direct/bookmarked /projects
  // hit there instead of the internal-facing list Brian's team uses.
  const flags = await resolveClientSurfaceFlags(orgId, Boolean(isSlateCeo));
  if (isSpatialOnlyPortal(flags)) {
    redirect(portalHomeHref(flags));
  }

  const isMobile = await isMobileServerLayout();
  return isMobile ? <MobileProjectsClient /> : <ProjectsClientPage />;
}
