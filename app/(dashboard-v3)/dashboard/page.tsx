import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "Dashboard",
};

/** Canonical post-login cockpit lives at /app. */
export default async function DashboardPage() {
  const { user } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/app");
  redirect("/app");
}
