import { redirect } from "next/navigation";
import { CoordinationHubShell } from "@/components/coordination/CoordinationHubShell";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContactsClient } from "@/components/coordination/ContactsClient";

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
      .limit(200);
    contacts.push(...((data ?? []) as ContactRow[]));
  }

  return (
    <CoordinationHubShell
      active="contacts"
      eyebrow="Coordination"
      title="Contacts"
    >
      <ContactsClient contacts={contacts} />
    </CoordinationHubShell>
  );
}

