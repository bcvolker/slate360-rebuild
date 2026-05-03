"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Plus, Search, Users2, X } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";

type ContactRow = {
  id: string; name: string; email: string | null; phone: string | null;
  company: string | null; initials: string | null; color: string | null;
};

interface Props {
  contacts: ContactRow[];
}

export function ContactsClient({ contacts }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", title: "" });
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to save contact");
      }
      setOpen(false);
      setForm({ name: "", email: "", phone: "", company: "", title: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts…"
            className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/70 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Contact list */}
      {filtered.length === 0 ? (
        <GlassCard className="p-10 text-center border-dashed">
          <Users2 className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 font-black text-slate-300">
            {query ? "No contacts match your search" : "No contacts yet"}
          </p>
          {!query && (
            <button
              onClick={() => setOpen(true)}
              className="mt-3 text-sm font-bold text-amber-400 hover:underline"
            >
              Add your first contact
            </button>
          )}
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white"
                  style={{ backgroundColor: c.color ?? "#D4AF37" }}
                >
                  {c.initials ?? c.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-slate-50">{c.name}</p>
                  {c.company && <p className="truncate text-xs text-slate-400">{c.company}</p>}
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
                    <Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{c.email}</span>
                  </a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
                    <Phone className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{c.phone}</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-black text-white">New Contact</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {(["name", "company", "title", "email", "phone"] as const).map((field) => (
                <div key={field}>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400 capitalize">
                    {field}{field === "name" && <span className="text-amber-400"> *</span>}
                  </label>
                  <input
                    type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                    value={form[field]}
                    onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400/60 focus:outline-none"
                  />
                </div>
              ))}
              {error && <p className="text-xs font-bold text-red-400">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-2xl border border-slate-700/60 py-2.5 text-sm font-bold text-slate-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 rounded-2xl bg-amber-500 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60 transition-colors">
                  {saving ? "Saving…" : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
