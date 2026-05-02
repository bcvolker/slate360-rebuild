import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { CoordinationHubShell } from "@/components/coordination/CoordinationHubShell";
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
      <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-10 text-center">
        <Inbox className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 font-black text-slate-300">No messages yet</p>
        <Link href="/site-walk" className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-slate-200 hover:bg-white/20">
          Go to Site Walk
        </Link>
      </div>
    </CoordinationHubShell>
  );
}
