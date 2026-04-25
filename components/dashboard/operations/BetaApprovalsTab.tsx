"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingToast } from "@/components/shared/FloatingToast";
import { useBetaUsers } from "@/lib/hooks/useBetaUsers";
import type { BetaUser } from "@/lib/hooks/useBetaUsers";

export function BetaApprovalsTab() {
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
    <div className="space-y-6">
      {toast && (
        <FloatingToast
          message={toast.message}
          variant={toast.variant}
          duration={4000}
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Users" value={users.length} loading={loading} />
        <SummaryCard label="Beta Approved" value={approvedCount} loading={loading} accent="text-green-500" />
        <SummaryCard label="Pending" value={pendingCount} loading={loading} accent="text-amber-500" />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {(["all", "approved", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                filter === f
                  ? "bg-cobalt text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all"
                ? `All (${users.length})`
                : f === "approved"
                ? `Approved (${approvedCount})`
                : `Pending (${pendingCount})`}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
          <Button variant="outline" size="sm" className="ml-3" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">No users match this filter.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Company</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Joined</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Beta Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
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
        </div>
      )}
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
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Loader2 className="mt-1 h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <p className={`mt-1 text-2xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
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
    <tr className="hover:bg-muted/20">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-foreground">
            {user.display_name || user.email || user.id.slice(0, 8)}
          </p>
          {user.email && user.display_name && (
            <p className="text-xs text-muted-foreground">{user.email}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{user.company || "—"}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {new Date(user.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </td>
      <td className="px-4 py-3 text-center">
        {user.is_beta_approved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-300">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-300">
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
