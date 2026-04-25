"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Building2, Shield, Clock } from "lucide-react";

interface OverviewMetrics {
  totalUsers: number;
  onboardedUsers: number;
  pendingBeta: number;
  totalOrgs: number;
  newUsers7d: number;
  newOrgs7d: number;
}

const EMPTY_METRICS: OverviewMetrics = {
  totalUsers: 0,
  onboardedUsers: 0,
  pendingBeta: 0,
  totalOrgs: 0,
  newUsers7d: 0,
  newOrgs7d: 0,
};

export function OverviewTab() {
  const [metrics, setMetrics] = useState<OverviewMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/operations/overview");
      if (cancelled) return;
      if (!res.ok) {
        setError("Failed to load overview metrics");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { metrics?: OverviewMetrics };
      setMetrics(data.metrics ?? EMPTY_METRICS);
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
  if (error) {
    return <p className="p-6 text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total users" value={metrics.totalUsers} icon={<Users className="w-5 h-5" />} />
        <MetricCard
          label="Onboarded"
          value={metrics.onboardedUsers}
          icon={<Shield className="w-5 h-5" />}
          accent="text-teal"
        />
        <MetricCard
          label="Pending beta"
          value={metrics.pendingBeta}
          icon={<Clock className="w-5 h-5" />}
          accent="text-yellow-500"
        />
        <MetricCard label="Organizations" value={metrics.totalOrgs} icon={<Building2 className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard label="New users (7d)" value={metrics.newUsers7d} icon={<Users className="w-5 h-5" />} />
        <MetricCard label="New orgs (7d)" value={metrics.newOrgs7d} icon={<Building2 className="w-5 h-5" />} />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-2">What&apos;s in Phase 1</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Beta Approvals — approve/revoke beta access</li>
          <li>User Accounts — search every account, see onboarding + beta status</li>
          <li>Organizations — list orgs with member counts and tier</li>
        </ul>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        <span className={accent ?? "text-cobalt"}>{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${accent ?? "text-foreground"}`}>{value.toLocaleString()}</div>
    </div>
  );
}
