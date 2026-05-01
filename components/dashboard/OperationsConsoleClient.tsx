"use client";

import { useState } from "react";
import { Shield, Users2, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingToast } from "@/components/shared/FloatingToast";
import { useBetaUsers } from "@/lib/hooks/useBetaUsers";
import type { BetaUser } from "@/lib/hooks/useBetaUsers";
import { OperationsConsoleNav } from "@/components/dashboard/operations-console/OperationsConsoleNav";
import type { OperationsConsoleCounts } from "@/lib/server/operations-console-counts";

type Props = {
  ownerEmail: string;
  initialCounts: OperationsConsoleCounts;
};

export default function OperationsConsoleClient({ ownerEmail, initialCounts }: Props) {
  const { users, loading, error, reload, toggleApproval } = useBetaUsers();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

  const filtered = users.filter((u) => {
    if (filter === "approved") return u.is_beta_approved;
    if (filter === "pending") return !u.is_beta_approved;
    return true;
  });

  const approvedCount = users.filter((u) => u.is_beta_approved).length;
  const pendingCount = users.filter((u) => !u.is_beta_approved).length;
  const navCounts: OperationsConsoleCounts = {
    ...initialCounts,
    pendingAccess: loading && users.length === 0 ? initialCounts.pendingAccess : pendingCount,
  };

  async function handleToggle(user: BetaUser) {
    setTogglingId(user.id);
    try {
      await toggleApproval(user.id, !user.is_beta_approved);
      setToast({
        message: `${user.email ?? user.id.slice(0, 8)} ${!user.is_beta_approved ? "approved" : "revoked"}`,
        variant: "success",
      });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to update",
        variant: "error",
      });
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 pb-28 text-slate-50 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
      {toast && (
        <FloatingToast
          message={toast.message}
          variant={toast.variant}
          duration={4000}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-amber-400/10 p-3 ring-1 ring-amber-400/20">
          <Shield className="h-5 w-5 text-amber-200" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Operations Console</h1>
          <p className="text-xs text-slate-400">Version 1 launch access &middot; {ownerEmail}</p>
        </div>
      </div>

      <OperationsConsoleNav active="/operations-console" counts={navCounts} />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Total Users" value={users.length} loading={loading} />
        <SummaryCard label="Version 1 Approved" value={approvedCount} loading={loading} accent="text-emerald-200" />
        <SummaryCard label="Pending" value={pendingCount} loading={loading} accent="text-amber-200" />
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OpsCapabilityCard title="Extend access" detail="Set Version 1 access through a fixed date or revoke when the launch window closes." />
        <OpsCapabilityCard title="Grant app access" detail="Issue temporary or permanent Site Walk, Tours, Design Studio, Content Studio, or SlateDrop overrides." />
        <OpsCapabilityCard title="Pricing controls" detail="Review plan prices, bundle economics, discount experiments, and upgrade paths before publishing." />
        <OpsCapabilityCard title="Enterprise seats" detail="Manage org-level seats, per-app assignment, permissions, and special customer terms." />
      </section>

      {/* Filter + reload */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
          {(["all", "approved", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-sky-400/15 text-sky-100 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {f === "all" ? `All (${users.length})` : f === "approved" ? `Approved (${approvedCount})` : `Pending (${pendingCount})`}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={reload} disabled={loading} className="text-slate-300 hover:bg-white/10 hover:text-white">
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* User list */}
      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
          <Button variant="outline" size="sm" className="ml-3" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">No users match this filter.</div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-md">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">User</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Company</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Joined</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-400">Version 1 Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtered.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  toggling={togglingId === u.id}
                  onToggle={() => handleToggle(u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OpsCapabilityCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-md">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  loading,
  accent,
}: {
  label: string;
  value: number;
  loading: boolean;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-md">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      {loading ? (
        <Loader2 className="mt-1 h-5 w-5 animate-spin text-slate-400" />
      ) : (
        <p className={`mt-1 text-2xl font-bold ${accent ?? "text-white"}`}>{value}</p>
      )}
    </div>
  );
}

function UserRow({
  user,
  toggling,
  onToggle,
}: {
  user: BetaUser;
  toggling: boolean;
  onToggle: () => void;
}) {
  return (
    <tr className="hover:bg-white/5">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-white">{user.display_name || user.email || user.id.slice(0, 8)}</p>
          {user.email && user.display_name && (
            <p className="text-xs text-slate-400">{user.email}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-slate-400">{user.company || "—"}</td>
      <td className="px-4 py-3 text-slate-400">
        {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </td>
      <td className="px-4 py-3 text-center">
        {user.is_beta_approved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <XCircle className="h-3 w-3" /> Pending
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant={user.is_beta_approved ? "outline" : "default"}
          size="sm"
          disabled={toggling}
          onClick={onToggle}
          className="min-w-[80px]"
        >
          {toggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : user.is_beta_approved ? (
            "Revoke"
          ) : (
            "Approve"
          )}
        </Button>
      </td>
    </tr>
  );
}
