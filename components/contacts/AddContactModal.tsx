"use client";

import { useState } from "react";
import { X, Loader2, ChevronDown } from "lucide-react";

const COLORS = ["#FF4D00","#1E3A8A","#059669","#7C3AED","#D97706","#DB2777","#0891B2","#65A30D"];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Add Contact</h3>
            <p className="text-xs text-gray-400 mt-0.5">Store a person in your org&apos;s contacts</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-0 px-6 pt-4">
          {(["quick", "detailed"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all capitalize ${
                mode === m ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              } ${m === "quick" ? "rounded-r-none" : "rounded-l-none"}`}
            >
              {m === "quick" ? "Quick add" : "Full profile"}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Name (always shown) */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Name *</label>
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={set("name")}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all"
            />
          </div>

          {/* Email (always shown) */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={set("email")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all"
            />
          </div>

          {mode === "detailed" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={set("phone")}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Title / Role</label>
                  <input
                    type="text"
                    placeholder="Project Manager"
                    value={form.title}
                    onChange={set("title")}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Company</label>
                <input
                  type="text"
                  placeholder="Company name"
                  value={form.company}
                  onChange={set("company")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all"
                />
              </div>

              {projects.length > 0 && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Link to Projects</label>
                  <div className="flex flex-wrap gap-1.5">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProject(p.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                          selectedProjects.includes(p.id)
                            ? "border-[#1E3A8A] bg-[#1E3A8A]/8 text-[#1E3A8A]"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Any relevant notes…"
                  value={form.notes}
                  onChange={set("notes")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] resize-none transition-all"
                />
              </div>
            </>
          )}

          {/* Color picker */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: "#FF4D00" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : "Add Contact"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
