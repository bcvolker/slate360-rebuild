"use client";

import { useState } from "react";
import { X } from "lucide-react";

const PRESET_TAGS = ["Client", "Vendor", "Subcontractor", "Architect", "Team", "Inspector"];

interface FormState {
  name: string; company: string; title: string; email: string; phone: string;
  address: string; notes: string; tags: string[];
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

function Field({ label, value, onChange, type = "text", required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}{required && <span className="text-[var(--graphite-primary)]"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-700/60 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[color-mix(in_srgb,var(--graphite-primary)_60%,transparent)] focus:outline-none"
      />
    </div>
  );
}

export function AddContactModal({ onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({
    name: "", company: "", title: "", email: "", phone: "",
    address: "", notes: "", tags: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState) {
    return (v: string) => setForm((p) => ({ ...p, [field]: v }));
  }

  function toggleTag(tag: string) {
    setForm((p) => ({
      ...p,
      tags: p.tags.includes(tag) ? p.tags.filter((t) => t !== tag) : [...p.tags, tag],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, company: form.company, title: form.title,
          email: form.email, phone: form.phone,
          notes: [form.address ? `Address: ${form.address}` : "", form.notes].filter(Boolean).join("\n\n") || undefined,
          tags: form.tags,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to save");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700/60 bg-slate-900 p-5 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-black text-white">New Contact</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Identity */}
          <Field label="Name" required value={form.name} onChange={set("name")} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company" value={form.company} onChange={set("company")} />
            <Field label="Title / Role" value={form.title} onChange={set("title")} />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" type="email" value={form.email} onChange={set("email")} />
            <Field label="Phone" type="tel" value={form.phone} onChange={set("phone")} />
          </div>
          <Field label="Address" value={form.address} onChange={set("address")} />

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => {
                const active = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors
                      ${active
                        ? "border-[color-mix(in_srgb,var(--graphite-primary)_60%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)] text-[var(--graphite-primary)]"
                        : "border-slate-700/60 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                      }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-700/60 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[color-mix(in_srgb,var(--graphite-primary)_60%,transparent)] focus:outline-none resize-none"
            />
          </div>

          {error && <p className="text-xs font-bold text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-700/60 py-2.5 text-sm font-bold text-slate-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-2xl bg-[var(--graphite-primary)] py-2.5 text-sm font-black text-slate-950 hover:bg-[color-mix(in_srgb,var(--graphite-primary)_85%,white)] disabled:opacity-60 transition-colors">
              {saving ? "Saving…" : "Save Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
