import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadMobileAppHomeData } from "@/lib/mobile/load-app-home-data";

/**
 * Inbox — inbound/actionable only per docs/design/SITEWALK360_LOCK_SHEET.md:
 * assigned items + notifications. Unsent reports live in Reports, not here
 * (an outbox inside an inbox weakens both models). Reuses the same
 * loadMobileAppHomeData assignments/alerts Home already fetches, just shown
 * in full rather than a preview slice.
 */
export default async function SW360InboxPage() {
  const context = await resolveServerOrgContext();
  const home = await loadMobileAppHomeData(context.orgId, context.user?.id ?? null);

  const hasNothing = home.assignments.length === 0 && home.alerts.length === 0;

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <h1 className="text-xl font-black tracking-tight text-[var(--sw360-charcoal)]">Inbox</h1>

      {hasNothing ? (
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--sw360-charcoal)]/25 bg-white/40 px-6 text-center">
          <p className="text-sm font-bold text-[var(--sw360-charcoal)]">Nothing needs you right now</p>
          <p className="text-xs text-[var(--sw360-charcoal)]/60">
            Assigned items and updates on your reports will show up here.
          </p>
        </div>
      ) : null}

      {home.assignments.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
            Assigned to you
          </p>
          <div className="flex flex-col gap-2">
            {home.assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3"
              >
                <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{a.title}</p>
                <span className="ml-2 shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/50">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {home.alerts.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
            Updates
          </p>
          <div className="flex flex-col gap-2">
            {home.alerts.map((a) => {
              const content = (
                <div className="rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--sw360-charcoal)]">{a.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--sw360-charcoal)]/60">{a.message}</p>
                </div>
              );
              return a.linkPath ? (
                <Link key={a.id} href={a.linkPath}>
                  {content}
                </Link>
              ) : (
                <div key={a.id}>{content}</div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
