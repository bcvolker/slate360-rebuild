import { redirect } from "next/navigation";
import { Building2, Mail, Phone, Users2 } from "lucide-react";
import { CoordinationHubShell } from "@/components/coordination/CoordinationHubShell";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "Contacts — Slate360" };
export const dynamic = "force-dynamic";

export default async function CoordinationContactsPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/coordination/contacts");

  return (
    <CoordinationHubShell
      active="contacts"
      eyebrow="Coordination Hub"
      title="Contact Management"
      description="A unified address book for global contacts plus project-scoped stakeholder groups. This is the source for Site Walk sharing, SlateDrop sends, deliverable recipients, and future bulk outreach."
    >
      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <ContactScope icon={Users2} title="Global Directory" detail="People used across every app and project." />
        <ContactScope icon={Building2} title="Project Stakeholders" detail="Owners, clients, trades, inspectors, and internal teams grouped per project." />
        <ContactScope icon={Mail} title="Email Lists" detail="Reusable recipient groups for reports, proposals, and status updates." />
        <ContactScope icon={Phone} title="Phone / SMS" detail="Mobile numbers for urgent field coordination and text links." />
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black text-slate-950">V1 contact model</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Step number="1" label="Add or import contacts" detail="Name, company, role, email, mobile, project tags." />
          <Step number="2" label="Attach to projects" detail="Assign contacts to stakeholder groups and permission roles." />
          <Step number="3" label="Use everywhere" detail="Send Site Walk deliverables, SlateDrop links, and feedback replies from one picker." />
        </div>
      </section>
    </CoordinationHubShell>
  );
}

function ContactScope({ icon: Icon, title, detail }: { icon: typeof Users2; title: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
      <Icon className="h-5 w-5 text-blue-700" />
      <h2 className="mt-3 text-sm font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function Step({ number, label, detail }: { number: string; label: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs font-black text-white">{number}</span>
      <p className="mt-3 text-sm font-black text-slate-900">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
    </div>
  );
}
