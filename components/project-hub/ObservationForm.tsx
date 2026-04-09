"use client";

import { Loader2, ThumbsUp, ThumbsDown, Minus, X } from "lucide-react";
import type { ObservationFormData } from "./ObservationsClient";

const CATEGORIES = ["Safety", "Quality", "Progress", "Environmental", "Weather", "Equipment", "Personnel", "General"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const SENTIMENTS: Array<{ value: "positive" | "negative" | "neutral"; label: string; Icon: typeof ThumbsUp; color: string; bg: string }> = [
  { value: "positive", label: "Positive", Icon: ThumbsUp, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-300" },
  { value: "neutral", label: "Neutral", Icon: Minus, color: "text-gray-600", bg: "bg-gray-50 border-gray-300" },
  { value: "negative", label: "Negative", Icon: ThumbsDown, color: "text-red-700", bg: "bg-red-50 border-red-300" },
];

interface Props {
  form: ObservationFormData;
  setForm: React.Dispatch<React.SetStateAction<ObservationFormData>>;
  onSubmit: () => void;
  onClose: () => void;
  saving: boolean;
  isEditing: boolean;
}

export default function ObservationForm({ form, setForm, onSubmit, onClose, saving, isEditing }: Props) {
  const set = (field: keyof ObservationFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-black text-gray-900">
          {isEditing ? "Edit Observation" : "New Observation"}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Sentiment */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Sentiment *</label>
          <div className="grid grid-cols-3 gap-2">
            {SENTIMENTS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => set("sentiment", s.value)}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                  form.sentiment === s.value ? s.bg : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                } ${form.sentiment === s.value ? s.color : ""}`}
              >
                <s.Icon size={14} /> {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Brief observation title"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Detailed observation description…"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 resize-none"
          />
        </div>

        {/* Category + Priority row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="">Select…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#D4AF37] focus:outline-none"
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Location / Area</label>
          <input
            value={form.location_area}
            onChange={(e) => set("location_area", e.target.value)}
            placeholder="e.g. Building A, Floor 3, NW corner"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Date Observed</label>
          <input
            type="date"
            value={form.observed_at}
            onChange={(e) => set("observed_at", e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#D4AF37] focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Additional Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Any additional context…"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 resize-none"
          />
        </div>

        {/* Photo upload placeholder */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Photos</label>
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-6 text-center">
            <p className="text-xs text-gray-400">Photo upload via SlateDrop integration — coming soon.</p>
            <p className="text-[10px] text-gray-300 mt-1">Photos will auto-save to the project&apos;s Records folder.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-5 py-4 flex items-center gap-3">
        <button
          onClick={onSubmit}
          disabled={saving || !form.title.trim()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {isEditing ? "Update" : "Create Observation"}
        </button>
        <button
          onClick={onClose}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
