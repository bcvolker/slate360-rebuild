"use client";

import GlassCard from "@/components/shared/GlassCard";
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
      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
          <User size={16} className="text-amber-500" /> Profile Information
        </h3>
        <div className="flex items-start gap-5">
          <div className="relative group">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-700 flex items-center justify-center text-foreground text-2xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
              <Camera size={20} className="text-foreground" />
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full max-w-sm px-3 py-2 rounded-xl border border-white/10 bg-amber-500/5 hover:bg-amber-500/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
              <p className="text-sm text-slate-300">{user.email}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Contact support to change your email address.</p>
            </div>
            <div className="flex gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Organization</label>
                <p className="text-sm text-slate-300">{orgName || "Personal"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
                <p className="text-sm text-slate-300 capitalize">{role}</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || name === user.name}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-500/80 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
              {saved ? "Saved" : "Save Changes"}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
