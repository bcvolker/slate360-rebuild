import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { DigitalTwinShell } from "@/components/digital-twin/DigitalTwinShell";
import { requireClientAppPage } from "@/lib/spatial-walkthrough/require-client-app";

export default async function DigitalTwinShellLayout({ children }: { children: ReactNode }) {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login");
  await requireClientAppPage("twin360");

  return <DigitalTwinShell orgName={ctx.orgName}>{children}</DigitalTwinShell>;
}
