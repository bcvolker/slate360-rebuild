"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileEmptyState } from "./MobileEmptyState";
import { mobileTokens } from "./mobileTokens";

export type MobileContactRow = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  title?: string | null;
  initials?: string | null;
};

type MobileContactsClientProps = {
  contacts: MobileContactRow[];
};

export function MobileContactsClient({ contacts }: MobileContactsClientProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) =>
      [contact.name, contact.email, contact.company, contact.title]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [contacts, search]);

  return (
    <div className={mobileTokens.mobilePageScrollInner}>
      <section className={cn(mobileTokens.panelBase, "p-5")}>
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className={mobileTokens.mobileEyebrowLabel}>Coordination</p>
        <h1 className={cn("mt-1", mobileTokens.moduleTitle)}>Contacts</h1>
        <p className={mobileTokens.moduleSubtitle}>
          Project contacts, vendors, and field partners for your workspace.
        </p>
      </section>

      <div className={cn(mobileTokens.mobileGlassCardSurface, "p-3")}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search contacts"
            className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0F15]/60 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-teal-400/40 focus:ring-2 focus:ring-teal-400/15"
          />
        </div>
      </div>

      <section className={cn(mobileTokens.panelBase, "overflow-hidden")}>
        {filtered.length === 0 ? (
          <MobileEmptyState
            icon={Users2}
            title="No contacts yet"
            description="Contacts added to your workspace will appear here."
          />
        ) : (
          filtered.map((contact) => (
            <Link
              key={contact.id}
              href={`/coordination/contacts?contact=${contact.id}`}
              className={mobileTokens.mobileGlassRowLink}
            >
              <span
                className={cn(
                  mobileTokens.mobileIconWell,
                  "h-9 w-9 text-xs font-bold uppercase",
                )}
              >
                {contact.initials ?? contact.name.slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{contact.name}</span>
                <span className="mt-0.5 block truncate text-xs text-zinc-400">
                  {[contact.title, contact.company].filter(Boolean).join(" · ") || contact.email || "Contact"}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
