import { redirect } from "next/navigation";
import { Mail, Phone, Users2 } from "lucide-react";
import { CoordinationHubShell } from "@/components/coordination/CoordinationHubShell";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Contacts — Slate360" };
export const dynamic = "force-dynamic";

type ContactRow = { id: string; name: string; email: string | null; phone: string | null; company: string | null; initials: string | null; color: string | null };

export default async function CoordinationContactsPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/coordination/contacts");

  const contacts: ContactRow[] = [];
  if (ctx.orgId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("org_contacts")
      .select("id, name, email, phone, company, initials, color")
      .eq("org_id", ctx.orgId)
      .eq("is_archived", false)
      .order("name")
      .limit(100);
    contacts.push(...((data ?? []) as ContactRow[]));
  }

  return (
    <CoordinationHubShell
      active="contacts"
      eyebrow="Coordination"
      title="Contacts"
      description="Team members, clients, trades, and stakeholders for fast outreach across your projects."
    >
      {contacts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-10 text-center">
          <Users2 className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 font-black text-slate-300">No contacts yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add team members, clients, and trades to send deliverables and assign walk items.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => <ContactCard key={c.id} contact={c} />)}
        </div>
      )}
    </CoordinationHubShell>
  );
}

function ContactCard({ contact }: { contact: ContactRow }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white" style={{ backgroundColor: contact.color ?? "#2563EB" }}>
          {contact.initials ?? contact.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-slate-50">{contact.name}</p>
          {contact.company && <p className="truncate text-xs text-slate-400">{contact.company}</p>}
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
            <Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{contact.email}</span>
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
            <Phone className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{contact.phone}</span>
          </a>
        )}
      </div>
    </div>
  );
}
