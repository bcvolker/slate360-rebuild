import { redirect } from "next/navigation";
import { Bell, FileInput, MessageSquare, Sparkles } from "lucide-react";
import { CoordinationHubShell } from "@/components/coordination/CoordinationHubShell";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "Communication Inbox — Slate360" };
export const dynamic = "force-dynamic";

export default async function CoordinationInboxPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/coordination/inbox");

  return (
    <CoordinationHubShell
      active="inbox"
      eyebrow="Coordination Hub"
      title="Communication Inbox"
      description="This is the bell destination: received files, stakeholder responses, feedback replies, comments, and action-required notifications should collect here instead of hiding inside account settings."
    >
      <section className="grid gap-3 lg:grid-cols-3">
        <InboxCard icon={Bell} title="Notifications" detail="Unread comments, assignment updates, deliverable views, and system replies." />
        <InboxCard icon={FileInput} title="Received" detail="Uploaded documents, stakeholder responses, intake links, and SlateDrop receipts." />
        <InboxCard icon={MessageSquare} title="Messages" detail="Threads tied to projects, Site Walk items, deliverables, and feedback tickets." />
      </section>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-blue-700" />
        <p className="mt-3 text-sm font-black text-slate-900">No communication items yet</p>
        <p className="mx-auto mt-1 max-w-2xl text-sm leading-6 text-slate-600">
          The next wiring pass should route feedback replies, Site Walk comments, received SlateDrop uploads, and stakeholder responses into this inbox with unread counts for the notification bell.
        </p>
      </section>
    </CoordinationHubShell>
  );
}

function InboxCard({ icon: Icon, title, detail }: { icon: typeof Bell; title: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
      <Icon className="h-5 w-5 text-blue-700" />
      <h2 className="mt-3 text-sm font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}
