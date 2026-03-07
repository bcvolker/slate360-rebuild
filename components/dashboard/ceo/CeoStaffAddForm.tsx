"use client";

import { useState } from "react";
import { Check, Bot, Dumbbell } from "lucide-react";

const SCOPE_OPTIONS = [
  { id: "market", label: "Market Robot", icon: Bot },
  { id: "athlete360", label: "Athlete360", icon: Dumbbell },
] as const;

type Props = {
  onGrant: (payload: {
    email: string;
    displayName?: string;
    accessScope?: string[];
    notes?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
};

export default function CeoStaffAddForm({ onGrant, onCancel }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [scope, setScope] = useState<string[]>(["market"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || scope.length === 0) return;
    setLoading(true);
    setError(null);
    const result = await onGrant({
      email: email.trim(),
      displayName: name.trim() || undefined,
      accessScope: scope,
      notes: notes.trim() || undefined,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to grant access");
      return;
    }
    onCancel();
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
          Internal Tab Access
        </label>
        <div className="flex flex-wrap gap-2">
          {SCOPE_OPTIONS.map(({ id, label, icon: ScopeIcon }) => {
            const checked = scope.includes(id);
            return (
              <button
                key={id}
                onClick={() =>
                  setScope(checked ? scope.filter((s) => s !== id) : [...scope, id])
                }
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  checked
                    ? "border-[#1E3A8A] bg-[#1E3A8A]/10 text-[#1E3A8A]"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <ScopeIcon size={12} />
                {label}
                {checked && <Check size={10} />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
          Notes
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Role, reason for access..."
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] outline-none"
        />
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !email.trim() || scope.length === 0}
          className="rounded-lg bg-[#1E3A8A] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#1E3A8A]/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Granting..." : "Grant Access"}
        </button>
      </div>
    </div>
  );
}
