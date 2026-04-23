"use client";

/**
 * ContactPicker — reusable contact/email selector popup.
 *
 * Used anywhere a user needs to select a contact or type an email:
 * - SlateDrop "Secure Send" share modal
 * - LocationMap contact recipients
 * - Project Hub RFI / Submittal assignment
 * - Any "send to" or "invite" input
 *
 * Usage:
 *   <ContactPicker
 *     onSelect={(contact) => setEmail(contact.email)}
 *     trigger={<button>Pick contact</button>}
 *   />
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, UserPlus, X, ChevronDown } from "lucide-react";

export interface ContactSuggestion {
  id?: string;
  name: string;
  email?: string | null;
  initials: string;
  color: string;
  subtitle?: string; // role, company, project
}

interface Props {
  /** Called when a contact is selected */
  onSelect: (contact: ContactSuggestion) => void;
  /** Optional pre-loaded contacts (e.g., from the widgets API) */
  initialContacts?: ContactSuggestion[];
  /** Placeholder for the search input */
  placeholder?: string;
  /** If true, renders as an inline input with contact suggestions (no trigger button) */
  inline?: boolean;
  /** Current value to show in inline mode */
  value?: string;
  /** Called on inline value change */
  onChange?: (value: string) => void;
  /** Classname override for the wrapper */
  className?: string;
  /** Disable the picker */
  disabled?: boolean;
}

export default function ContactPicker({
  onSelect,
  initialContacts = [],
  placeholder = "Search contacts or type email…",
  inline = false,
  value = "",
  onChange,
  className = "",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [contacts, setContacts] = useState<ContactSuggestion[]>(initialContacts);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(initialContacts.length > 0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep query in sync with external value (inline mode)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchContacts = useCallback(async (q: string) => {
    if (loaded && !q) return; // already have full list; filter client-side
    setLoading(true);
    try {
      const url = q
        ? `/api/contacts?q=${encodeURIComponent(q)}`
        : "/api/contacts";
      const res = await fetch(url);
      if (res.ok) {
        const { contacts: raw } = await res.json() as { contacts: Array<{
          id: string; name: string; email?: string | null; initials: string; color: string;
          title?: string | null; company?: string | null;
        }> };
        setContacts(
          raw.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            initials: c.initials,
            color: c.color,
            subtitle: [c.title, c.company].filter(Boolean).join(" · "),
          }))
        );
        if (!q) setLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  }, [loaded]);

  function handleQueryChange(val: string) {
    setQuery(val);
    onChange?.(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchContacts(val), 200);
  }

  function handleOpen() {
    setOpen(true);
    if (!loaded) void fetchContacts("");
  }

  function handleSelect(c: ContactSuggestion) {
    setQuery(c.email ?? c.name);
    onChange?.(c.email ?? c.name);
    onSelect(c);
    setOpen(false);
  }

  // Filter client-side when we have the full list
  const suggestions = loaded && !query
    ? contacts.slice(0, 8)
    : contacts
        .filter(
          (c) =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.email?.toLowerCase().includes(query.toLowerCase()) ||
            c.subtitle?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8);

  const inputClasses =
    "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  if (inline) {
    return (
      <div ref={wrapperRef} className={`relative ${className}`}>
        <div className="relative">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={handleOpen}
            placeholder={placeholder}
            disabled={disabled}
            className={`${inputClasses} pl-9 pr-8`}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); onChange?.(""); setOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {open && (suggestions.length > 0 || loading) && (
          <ContactDropdown
            suggestions={suggestions}
            loading={loading}
            query={query}
            onSelect={handleSelect}
          />
        )}
      </div>
    );
  }

  // Button trigger mode
  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        onClick={handleOpen}
        disabled={disabled}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-cobalt hover:text-cobalt-hover transition-all disabled:opacity-50"
      >
        <UserPlus size={14} />
        Pick contact
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-40 w-72 bg-white rounded-xl border border-gray-100 shadow-2xl overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]"
                />
              </div>
            </div>
            <ContactDropdown
              suggestions={suggestions}
              loading={loading}
              query={query}
              onSelect={handleSelect}
              embedded
            />
          </div>
        </>
      )}
    </div>
  );
}

function ContactDropdown({
  suggestions,
  loading,
  query,
  onSelect,
  embedded = false,
}: {
  suggestions: ContactSuggestion[];
  loading: boolean;
  query: string;
  onSelect: (c: ContactSuggestion) => void;
  embedded?: boolean;
}) {
  const base = embedded ? "" : "absolute left-0 top-full mt-1.5 z-40 w-full bg-white rounded-xl border border-gray-100 shadow-2xl";

  if (loading) {
    return (
      <div className={base}>
        <div className="p-4 text-center">
          <div className="w-4 h-4 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className={base}>
      <div className="py-1 max-h-56 overflow-y-auto">
        {suggestions.map((c) => (
          <button
            key={c.id ?? c.email ?? c.name}
            onClick={() => onSelect(c)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-gray-50 transition-colors text-left"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-foreground text-[10px] font-bold shrink-0"
              style={{ backgroundColor: c.color }}
            >
              {c.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{c.name}</p>
              {(c.email || c.subtitle) && (
                <p className="text-[10px] text-gray-400 truncate">{c.email ?? c.subtitle}</p>
              )}
            </div>
          </button>
        ))}
        {suggestions.length === 0 && query && (
          <div className="px-4 py-3 text-xs text-gray-400">
            No contacts found for &ldquo;{query}&rdquo;
          </div>
        )}
        {suggestions.length === 0 && !query && (
          <div className="px-4 py-3 text-xs text-gray-400">No contacts in your org yet</div>
        )}
      </div>
    </div>
  );
}
