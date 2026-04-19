"use client";

import { useState } from "react";
import { User, Loader2, Camera, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  user: { id: string; name: string; email: string; avatar?: string };
  orgName: string;
  role: string;
}

export default function AccountProfileTab({ user, orgName, role }: Props) {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({ data: { full_name: name } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar + Name */}
      <div className="rounded-2xl border border-app bg-app-card p-6">
        <h3 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <User size={16} className="text-[#3B82F6]" /> Profile Information
        </h3>
        <div className="flex items-start gap-5">
          <div className="relative group">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-zinc-700 flex items-center justify-center text-white text-2xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
              <Camera size={20} className="text-white" />
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full max-w-sm px-3 py-2 rounded-xl border border-app bg-white/[0.04] text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Email</label>
              <p className="text-sm text-zinc-300">{user.email}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Contact support to change your email address.</p>
            </div>
            <div className="flex gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Organization</label>
                <p className="text-sm text-zinc-300">{orgName || "Personal"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Role</label>
                <p className="text-sm text-zinc-300 capitalize">{role}</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || name === user.name}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-[#3B82F6]/80 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
              {saved ? "Saved" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-2xl border border-app bg-app-card p-6">
        <h3 className="text-sm font-bold text-zinc-100 mb-4">Preferences</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Theme</label>
            <select
              className="w-full px-3 py-2 rounded-xl border border-app bg-white/[0.04] text-zinc-100 text-sm"
              defaultValue="dark"
              onChange={(e) => {
                localStorage.setItem("slate360-theme", e.target.value);
                document.documentElement.classList.remove("light", "dark");
                document.documentElement.classList.add(e.target.value === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : e.target.value);
              }}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Timezone</label>
            <p className="text-sm text-zinc-300">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
