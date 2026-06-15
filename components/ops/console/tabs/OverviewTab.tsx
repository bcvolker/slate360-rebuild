"use client";

import { useOpsConsoleStore } from "@/lib/stores/useOpsConsoleStore";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={t.card}>
      <div className={t.statValue}>{value}</div>
      <div className={t.statLabel}>{label}</div>
    </div>
  );
}

export function OverviewTab() {
  const { overview, counts, getActionItems } = useOpsConsoleStore();
  const actions = getActionItems();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Organizations" value={overview?.totalOrgs ?? "—"} />
        <Stat label="Users" value={overview?.totalUsers ?? "—"} />
        <Stat label="Pending approvals" value={counts?.pendingAccess ?? 0} />
        <Stat label="Open feedback" value={counts?.openFeedback ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={t.card}>
          <p className={t.eyebrow}>Priority actions</p>
          <ul className="mt-3 space-y-2">
            {actions.map((item, i) => (
              <li key={i} className={t.row}>
                <span className="text-sm text-[var(--graphite-text-body)]">{item.label}</span>
                <span
                  className={
                    item.severity === "critical"
                      ? t.badgeCritical
                      : item.severity === "warning"
                        ? t.badgeMuted
                        : t.badgeInfo
                  }
                >
                  {item.severity}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={t.card}>
          <p className={t.eyebrow}>Orgs by tier</p>
          {overview && Object.keys(overview.tierBreakdown).length ? (
            <ul className="mt-3 space-y-2">
              {Object.entries(overview.tierBreakdown).map(([tier, count]) => (
                <li key={tier} className={t.row}>
                  <span className="text-sm capitalize text-[var(--graphite-text-body)]">{tier}</span>
                  <span className="text-sm font-semibold text-[var(--graphite-text-header)]">{count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`mt-3 ${t.emptyNote}`}>No organization data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
