import { redirect } from "next/navigation";
import { CoordinationHubShell } from "@/components/coordination/CoordinationHubShell";
import { InboxTabs } from "@/components/coordination/InboxTabs";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "Inbox — Slate360" };
export const dynamic = "force-dynamic";

export default async function CoordinationInboxPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/coordination/inbox");

  return (
    <CoordinationHubShell
      active="inbox"
      eyebrow="Coordination"
      title="Inbox"
    >
      <InboxTabs />
    </CoordinationHubShell>
  );
}
