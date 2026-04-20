"use client";

import { useEffect, useState } from "react";
import { Loader2, CreditCard, AlertTriangle, CheckCircle2 } from "lucide-react";

type SubStatus = "active" | "trialing" | "past_due" | "canceled";

interface SubRow {
  org_id: string;
  org_name: string;
  tier: string;
  status: SubStatus;
  current_period_end: string;
}

export function SubscriptionsTab() {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/operations/subscriptions");
      if (cancelled) return;
      if (!res.ok) {
        setError("Failed to load subscriptions");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { subscriptions?: SubRow[] };
      setSubs(data.subscriptions ?? []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-cobalt" />
      </div>
    );
  }
  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-foreground">Organization Subscriptions</h2>
        <button
          disabled
          className="text-xs bg-muted/30 border border-border px-3 py-1.5 rounded-md text-muted-foreground cursor-not-allowed"
          title="Phase 2 — Stripe sync"
        >
          Sync with Stripe
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/20 border-b border-border text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-medium">Organization</th>
              <th className="px-6 py-3 font-medium">Tier</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Renews / Expires</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subs.map((sub) => (
              <tr key={sub.org_id} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">{sub.org_name}</td>
                <td className="px-6 py-4 text-foreground uppercase tracking-wider text-xs font-bold">
                  {sub.tier}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={sub.status} />
                </td>
                <td className="px-6 py-4 text-muted-foreground text-xs">
                  {new Date(sub.current_period_end).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button disabled className="text-xs text-cobalt/60 font-medium cursor-not-allowed">
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No subscriptions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SubStatus }) {
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1 text-green-500 text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" /> Active
      </span>
    );
  if (status === "trialing")
    return (
      <span className="inline-flex items-center gap-1 text-cobalt text-xs font-medium">
        <CreditCard className="w-3.5 h-3.5" /> Trial
      </span>
    );
  if (status === "past_due")
    return (
      <span className="inline-flex items-center gap-1 text-yellow-500 text-xs font-medium">
        <AlertTriangle className="w-3.5 h-3.5" /> Past Due
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium">
      <AlertTriangle className="w-3.5 h-3.5" /> Canceled
    </span>
  );
}
