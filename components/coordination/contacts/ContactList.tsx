"use client";

import { Search, UserCircle, Users, ExternalLink } from "lucide-react";
import type { Contact } from "./types";

interface Props {
  contacts: Contact[];
  selectedId: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (c: Contact) => void;
}

export function ContactList({ contacts, selectedId, query, onQueryChange, onSelect }: Props) {
  function getRoleBadge(tags: string[] = []) {
    if (tags.includes("Team")) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-green-500/20 px-1.5 py-0.5 text-[9px] font-bold text-green-400 border border-green-500/30">
          <UserCircle className="w-2.5 h-2.5" /> Team Member
        </span>
      );
    }
    if (tags.includes("Collaborator")) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--graphite-primary)] border border-[color-mix(in_srgb,var(--graphite-primary)_30%,transparent)]">
          <Users className="w-2.5 h-2.5" /> Collaborator
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-slate-500/20 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 border border-slate-500/30">
        <ExternalLink className="w-2.5 h-2.5" /> External Stakeholder
      </span>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="relative mb-3 shrink-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search contacts…"
          className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/70 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[color-mix(in_srgb,var(--graphite-primary)_60%,transparent)] focus:outline-none"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar pr-0.5">
        {contacts.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-500">No contacts found</p>
        )}
        {contacts.map((c) => {
          const isActive = c.id === selectedId;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={`w-full flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-all duration-150
                ${isActive
                  ? "border-[color-mix(in_srgb,var(--graphite-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
                  : "border-transparent hover:border-slate-700/60 hover:bg-slate-800/60"
                }`}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-black text-white"
                style={{ backgroundColor: c.color ?? "#D4AF37" }}
              >
                {c.initials ?? c.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={`truncate text-sm font-black ${isActive ? "text-[var(--graphite-primary)]" : "text-slate-100"}`}>
                    {c.name}
                  </p>
                </div>
                <div className="mt-0.5 flex flex-col gap-1 items-start">
                  {c.company && <p className="truncate text-xs text-slate-400">{c.company}</p>}
                  {getRoleBadge(c.tags)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
