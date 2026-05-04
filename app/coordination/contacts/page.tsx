import { redirect } from "next/navigation";
import { CoordinationHubShell } from "@/components/coordination/CoordinationHubShell";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContactsClient } from "@/components/coordination/ContactsClient";
import type { Contact } from "@/components/coordination/contacts/types";

export const metadata = { title: "Contacts — Slate360" };
export const dynamic = "force-dynamic";

export default async function CoordinationContactsPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/coordination/contacts");

  let contacts: Contact[] = [];
  if (ctx.orgId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("org_contacts")
      .select("id, name, email, phone, company, title, notes, initials, color, tags, contact_projects(project_id, projects(id, name))")
      .eq("org_id", ctx.orgId)
      .eq("is_archived", false)
      .order("name")
      .limit(200);
    contacts = (data ?? []) as unknown as Contact[];
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

