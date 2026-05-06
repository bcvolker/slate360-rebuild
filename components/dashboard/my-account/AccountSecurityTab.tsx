"use client";

import GlassCard from "@/components/shared/GlassCard";
import { Shield, KeyRound, Monitor, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";

interface Props {
  overview: DashboardAccountOverview | null;
  userEmail: string;
  loading: boolean;
}

export default function AccountSecurityTab({ overview, userEmail, loading }: Props) {
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handlePasswordReset() {
    setResetBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      });
      setResetSent(true);
    } finally {
      setResetBusy(false);
    }
  }

  const sessions = overview?.sessions ?? [];

  return (
    <div className="space-y-6">
      {/* Password */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
          <KeyRound size={16} className="text-amber-500" /> Password
        </h3>
        <button
          onClick={handlePasswordReset}
          disabled={resetBusy || resetSent}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-500/80 transition-colors disabled:opacity-50"
        >
          {resetBusy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          {resetSent ? "Reset Link Sent" : "Send Reset Link"}
        </button>
        {resetSent && (
          <p className="mt-3 text-xs text-slate-400">Check <strong className="text-slate-300">{userEmail}</strong> for your reset link.</p>
        )}
      </GlassCard>

      {/* Active Sessions */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Monitor size={16} className="text-amber-500" /> Recent Sessions
        </h3>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-500" size={20} /></div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-500">No recent session data available.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-amber-500/5 hover:bg-amber-500/10 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-slate-200">{s.device}</p>
                  <p className="text-[10px] text-slate-500">{s.ip}</p>
                </div>
                <p className="text-[10px] text-slate-500">
                  {new Date(s.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Data Export & Deletion */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
          <Shield size={16} className="text-amber-500" /> Data & Privacy
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-200">Export My Data</p>
              <p className="text-[10px] text-slate-500">Download a copy of all your account data.</p>
            </div>
            <button className="rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-white/10 px-3 py-2 text-[10px] font-semibold text-slate-300 hover:bg-amber-500/10 hover:bg-amber-500/15 transition-colors">
              Request Export
            </button>
          </div>
          <div className="h-px bg-amber-500/5 hover:bg-amber-500/10" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-400">Delete Account</p>
              <p className="text-[10px] text-slate-500">Permanently delete your account and all associated data.</p>
            </div>
            <button className="rounded-xl bg-red-950/30 border border-red-900/50 px-3 py-2 text-[10px] font-semibold text-red-400 hover:bg-red-950/50 transition-colors">
              Request Deletion
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
