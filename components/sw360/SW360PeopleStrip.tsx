import Link from "next/link";
import type { PeopleStripContact } from "@/lib/sw360/load-home-strips";

/**
 * Always renders (with an empty-state CTA) — Home's second cross-cutting
 * block per rev 7 lock (Q1 + Q4). Contacts are org-wide, not project-scoped,
 * so they earn a Home slot the same way calendar events do.
 */
export function SW360PeopleStrip({ contacts }: { contacts: PeopleStripContact[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
          People
        </p>
        <Link href="/sw360/contacts" className="text-xs font-bold text-[var(--sw360-green-light)]">
          All contacts
        </Link>
      </div>
      {contacts.length === 0 ? (
        <Link
          href="/sw360/contacts"
          className="flex min-h-[64px] flex-col justify-center rounded-2xl border border-dashed border-[var(--sw360-charcoal)]/25 bg-white/40 px-5"
        >
          <p className="text-sm text-[var(--sw360-charcoal)]/60">
            Add a GC, owner, or sub — they show up across every project.
          </p>
        </Link>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {contacts.map((c) => (
            <Link
              key={c.id}
              href={`/sw360/contacts?contact=${c.id}`}
              className="flex w-28 shrink-0 flex-col items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white/70 p-3 text-center"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sw360-green-light)]/10 text-sm font-bold text-[var(--sw360-green-light)]">
                {c.initials ?? c.name.slice(0, 2).toUpperCase()}
              </span>
              <p className="w-full truncate text-xs font-semibold text-[var(--sw360-charcoal)]">{c.name}</p>
              {c.company ? (
                <p className="w-full truncate text-[10px] text-[var(--sw360-charcoal)]/50">{c.company}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
