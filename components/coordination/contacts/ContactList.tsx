"use client";

import { Search } from "lucide-react";
import type { Contact } from "./types";

interface Props {
  contacts: Contact[];
  selectedId: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (c: Contact) => void;
}

export function ContactList({ contacts, selectedId, query, onQueryChange, onSelect }: Props) {
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
          className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/70 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
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
                  ? "border-amber-400/50 bg-amber-500/10"
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
                <p className={`truncate text-sm font-black ${isActive ? "text-amber-100" : "text-slate-100"}`}>
                  {c.name}
                </p>
                {c.company && (
                  <p className="truncate text-xs text-slate-400">{c.company}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
