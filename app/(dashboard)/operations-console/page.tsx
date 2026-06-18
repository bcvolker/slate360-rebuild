import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadOpsConsoleData } from "@/lib/server/ops-console-data";
import { OperationsConsoleClient } from "@/components/ops/console/OperationsConsoleClient";

export const metadata = {
  title: "Operations Console — Slate360",
};

export const dynamic = "force-dynamic";

export default async function OperationsConsolePage() {
  const { user, canAccessOperationsConsole, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!canAccessOperationsConsole) notFound();

  const initial = await loadOpsConsoleData(isSlateCeo);

  return <OperationsConsoleClient initial={initial} />;
}
