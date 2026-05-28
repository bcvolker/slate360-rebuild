import { redirect } from "next/navigation";
import { MobileProjectsClient } from "@/components/mobile-system/MobileProjectsClient";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "Projects — Slate360" };

export default async function ProjectsPage() {
  const { user } = await resolveServerOrgContext();
  if (!user) redirect("/login?next=/projects");

  return <MobileProjectsClient />;
}
