import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "Analytics & Reports — Slate360",
};

export default async function AnalyticsPage() {
  const { user } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  redirect("/site-walk");
}
