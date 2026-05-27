import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { DigitalTwinShell } from "@/components/digital-twin/DigitalTwinShell";

export default async function DigitalTwinShellLayout({ children }: { children: ReactNode }) {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login");

  return <DigitalTwinShell orgName={ctx.orgName}>{children}</DigitalTwinShell>;
}
