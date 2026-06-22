import { redirect } from "next/navigation";
import ProjectsClientPage from "./ClientPage";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "Projects — Slate360",
};

export default async function DashboardProjectsPage() {
  const { user } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/projects");

  return <ProjectsClientPage />;
}
