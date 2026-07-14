import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SW360BackHeader } from "@/components/sw360/SW360BackHeader";
import { SW360ContactsClient, type SW360Contact } from "@/components/sw360/SW360ContactsClient";

/**
 * Full Contacts screen — Q4's second multi-door destination (rev 7 lock).
 * Reads org_contacts directly, same table Home's People strip and a
 * project's Team tab will link back into.
 */
export default async function SW360ContactsPage() {
  const context = await resolveServerOrgContext();
  const orgId = context.orgId;

  const { data } = orgId
    ? await createAdminClient()
        .from("org_contacts")
        .select("id, name, company, title, email, phone, initials")
        .eq("org_id", orgId)
        .eq("is_archived", false)
        .order("name", { ascending: true })
        .limit(500)
    : { data: [] as SW360Contact[] };

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <SW360BackHeader href="/sw360" label="Home" />
      <h1 className="text-xl font-black tracking-tight text-[var(--sw360-charcoal)]">Contacts</h1>
      <SW360ContactsClient initialContacts={(data ?? []) as SW360Contact[]} />
    </div>
  );
}
