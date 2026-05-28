import { redirect } from "next/navigation";
import { MobileContactsClient } from "@/components/mobile-system/MobileContactsClient";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Contacts — Slate360" };
export const dynamic = "force-dynamic";

export default async function CoordinationContactsPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/coordination/contacts");

  let contacts: {
    id: string;
    name: string;
    email?: string | null;
    company?: string | null;
    title?: string | null;
    initials?: string | null;
  }[] = [];

  if (ctx.orgId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("org_contacts")
      .select("id, name, email, company, title, initials")
      .eq("org_id", ctx.orgId)
      .eq("is_archived", false)
      .order("name")
      .limit(200);
    contacts = data ?? [];
  }

  return <MobileContactsClient contacts={contacts} />;
}
