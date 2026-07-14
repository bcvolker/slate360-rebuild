"use client";

import { useMemo, useState } from "react";
import { Plus, Loader2 } from "lucide-react";

export type SW360Contact = {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  initials: string | null;
};

/**
 * Full Contacts screen client — search over the server-loaded org_contacts
 * list, plus a lean inline add-contact form (POSTs to the existing
 * /api/contacts route; the desktop AddContactModal isn't reused since it's
 * styled for the legacy Graphite Glass system, not SW360's Field System).
 */
export function SW360ContactsClient({ initialContacts }: { initialContacts: SW360Contact[] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Enter a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not save the contact. Try again.");
        return;
      }
      const body = (await res.json()) as { contact: SW360Contact };
      setContacts((prev) => [body.contact, ...prev]);
      setForm({ name: "", company: "", email: "", phone: "" });
      setAdding(false);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search contacts"
        className="min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
      />

      {adding ? (
        <form
          onSubmit={handleAdd}
          className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-white/70 p-4"
        >
          {error ? <p className="text-xs font-semibold text-[var(--sw360-destructive)]">{error}</p> : null}
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Name"
            className="min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.company}
              onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
              placeholder="Company"
              className="min-h-[44px] rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Phone"
              className="min-h-[44px] rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
            />
          </div>
          <input
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email"
            type="email"
            className="min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-[var(--border)] text-sm font-bold text-[var(--sw360-charcoal)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-[var(--sw360-green-light)] text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Save contact"}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sw360-green-light)] text-sm font-bold text-white"
        >
          <Plus size={16} /> Add contact
        </button>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--sw360-charcoal)]/60">
          {contacts.length === 0 ? "No contacts yet." : "No contacts match your search."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--sw360-green-light)]/10 text-xs font-bold text-[var(--sw360-green-light)]">
                {c.initials ?? c.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{c.name}</p>
                {c.company || c.title ? (
                  <p className="truncate text-xs text-[var(--sw360-charcoal)]/50">
                    {[c.title, c.company].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
              {c.phone ? (
                <a
                  href={`tel:${c.phone}`}
                  className="shrink-0 text-xs font-bold text-[var(--sw360-green-light)]"
                >
                  Call
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
