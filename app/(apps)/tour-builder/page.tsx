import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { TourBuilderShell } from "@/components/tours/TourBuilderShell";

export default async function TourBuilderPage() {
  // 360 Tours is CEO-only and NOT part of the shippable app (Site Walk + Twin 360 only).
  // Gated like Thermal Studio so it can never be reached by a reviewer/beta/entitled user.
  const { user, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/tour-builder");
  if (!isSlateCeo) notFound();

  return <TourBuilderShell />;
}
