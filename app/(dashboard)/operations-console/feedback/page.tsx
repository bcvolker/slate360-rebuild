import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "Feedback Inbox — Operations Console" };
export const dynamic = "force-dynamic";

export default async function OperationsFeedbackPage() {
  const { user, canAccessOperationsConsole } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!canAccessOperationsConsole) notFound();
  redirect("/site-walk");
}
