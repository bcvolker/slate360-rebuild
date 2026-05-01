import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import ClientPage from "./ClientPage";

export const metadata = {
  title: "Projects — Slate360",
};

export default async function ProjectsServerPage() {
  const { user } = await resolveServerOrgContext();

  if (!user) redirect("/login");

  return <ClientPage />;
}