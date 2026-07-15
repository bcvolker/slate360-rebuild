import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadMobileAppHomeData } from "@/lib/mobile/load-app-home-data";
import { SW360InboxClient } from "@/components/sw360/SW360InboxClient";
import { SW360BackHeader } from "@/components/sw360/SW360BackHeader";

/**
 * Inbox — inbound/actionable only per docs/design/SITEWALK360_LOCK_SHEET.md:
 * assigned items + notifications. Search + Open/Flagged/To-do filters per
 * the rev 7 lock (Q3) now that the flagged/is_todo columns are live.
 */
export default async function SW360InboxPage() {
  const context = await resolveServerOrgContext();
  const home = await loadMobileAppHomeData(context.orgId, context.user?.id ?? null);

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <SW360BackHeader href="/sw360" label="Home" />
      <h1 className="text-xl font-black tracking-tight text-[var(--sw360-charcoal)]">Inbox</h1>
      <SW360InboxClient assignments={home.assignments} alerts={home.alerts} />
    </div>
  );
}
