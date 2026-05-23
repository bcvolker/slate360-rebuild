import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export default async function OperationsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { user, canAccessOperationsConsole } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!canAccessOperationsConsole) notFound();
  void params;
  redirect("/site-walk");
}
