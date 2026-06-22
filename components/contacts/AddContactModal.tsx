"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import {
  darkButtonClass,
  darkFieldClass,
  darkModalOverlayClass,
  darkModalPanelClass,
} from "@/components/ui/dark-surface-styles";

// Avatar swatch palette (data — user picks a contact color).
const COLORS = ["#3B82F6","#2563EB","#059669","#7C3AED","#2563EB","#DB2777","#0891B2","#65A30D"];

const labelClass = "mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--graphite-muted)]";

interface Project { id: string; name: string }

interface Props {
  projects?: Project[];
  onClose: () => void;
  onCreated: (contact: Record<string, unknown>) => void;
}

export default function AddContactModal({ projects = [], onClose, onCreated }: Props) {
  const [mode, setMode] = useState<"quick" | "detailed">("quick");
  const [saving, setSaving] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    notes: "",
  });
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function toggleProject(id: string) {
    setSelectedProjects((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, color, project_ids: selectedProjects }),
      });
      const data = await res.json() as { contact?: Record<string, unknown>; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to create contact"); return; }
      onCreated(data.contact!);
      onClose();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={darkModalOverlayClass} onClick={onClose}>
      <div className={darkModalPanelClass("max-w-md")} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-[var(--graphite-text-header)]">Add Contact</h3>
            <p className="mt-0.5 text-xs text-[var(--graphite-muted)]">Store a person in your org&apos;s contacts</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--graphite-muted)] hover:bg-white/10 hover:text-[var(--graphite-text-header)]">
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex shrink-0 gap-0 px-6 pt-4">
          {(["quick", "detailed"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition-all ${
                mode === m
                  ? "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]"
                  : "bg-white/5 text-[var(--graphite-muted)] hover:bg-white/10"
              } ${m === "quick" ? "rounded-r-none" : "rounded-l-none"}`}
            >
              {m === "quick" ? "Quick add" : "Full profile"}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          {/* Name (always shown) */}
          <div>
            <label className={labelClass}>Name *</label>
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={set("name")}
              autoFocus
              className={darkFieldClass()}
            />
          </div>

          {/* Email (always shown) */}
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={set("email")}
              className={darkFieldClass()}
            />
          </div>

          {mode === "detailed" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={set("phone")}
                    className={darkFieldClass()}
                  />
                </div>
                <div>
                  <label className={labelClass}>Title / Role</label>
                  <input
                    type="text"
                    placeholder="Project Manager"
                    value={form.title}
                    onChange={set("title")}
                    className={darkFieldClass()}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Company</label>
                <input
                  type="text"
                  placeholder="Company name"
                  value={form.company}
                  onChange={set("company")}
                  className={darkFieldClass()}
                />
              </div>

              {projects.length > 0 && (
                <div>
                  <label className={labelClass}>Link to Projects</label>
                  <div className="flex flex-wrap gap-1.5">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProject(p.id)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                          selectedProjects.includes(p.id)
                            ? "border-[color-mix(in_srgb,var(--graphite-primary)_60%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)]"
                            : "border-white/15 text-[var(--graphite-muted)] hover:border-white/30"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  rows={3}
                  placeholder="Any relevant notes…"
                  value={form.notes}
                  onChange={set("notes")}
                  className={darkFieldClass("resize-none")}
                />
              </div>
            </>
          )}

          {/* Color picker */}
          <div>
            <label className={labelClass}>Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${color === c ? "scale-110 border-white" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs font-medium text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className={darkButtonClass("primary", "flex-1")}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : "Add Contact"}
          </button>
          <button onClick={onClose} className={darkButtonClass("ghost", "px-5")}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
