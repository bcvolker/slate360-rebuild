import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
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
      <InboxTabs>
        <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 py-12 text-center">
          <Inbox className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 text-sm font-black text-slate-300">No messages yet</p>
          <p className="mt-1 text-xs text-slate-500">Messages, file shares, and alerts from your team will appear here.</p>
        </div>
      </InboxTabs>
    </CoordinationHubShell>
  );
}
