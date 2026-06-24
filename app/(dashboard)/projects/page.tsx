import { redirect } from "next/navigation";
import ProjectsClientPage from "./ClientPage";
import { MobileProjectsClient } from "@/components/mobile-system/MobileProjectsClient";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { isMobileServerLayout } from "@/lib/server/device-layout";

export const metadata = {
  title: "Projects — Slate360",
};

// Single /projects route. Next.js route groups don't change the URL, so this
// page cannot also exist under (mobile) — it renders the mobile or desktop
// client based on device, the same way the surrounding layouts adapt chrome.
export default async function ProjectsPage() {
  const { user } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/projects");

  const isMobile = await isMobileServerLayout();
  return isMobile ? <MobileProjectsClient /> : <ProjectsClientPage />;
}
