"use client";

import { useOpsConsoleStore } from "@/lib/stores/useOpsConsoleStore";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";
import type { OpsConsoleTab } from "@/lib/ops-console/types";

const JUMPS: { id: OpsConsoleTab; label: string }[] = [
  { id: "leads", label: "Leads" },
  { id: "portals", label: "Portals" },
  { id: "jobs", label: "Jobs" },
  { id: "deliverables", label: "Deliverables" },
  { id: "commercial", label: "Quotes and invoices" },
  { id: "contacts", label: "Contacts" },
  { id: "feedback", label: "Feedback" },
  { id: "health", label: "System health" },
];

function StatButton({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${t.card} text-left`}>
      <div className={t.statValue}>{value}</div>
      <div className={t.statLabel}>{label}</div>
    </button>
  );
}

export function OverviewTab() {
  const { counts, health, setActiveTab } = useOpsConsoleStore();
  const checks = health
    ? [
        ["Stripe", health.stripe && health.stripeWebhook],
        ["Database", health.supabase && health.supabaseService],
        ["App URL", health.appUrl],
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <StatButton
          label="Pending approvals"
          value={counts?.pendingAccess ?? 0}
          onClick={() => setActiveTab("feedback")}
        />
        <StatButton
          label="Open feedback"
          value={counts?.openFeedback ?? 0}
          onClick={() => setActiveTab("feedback")}
        />
      </div>

      <section className={t.card}>
        <p className={t.eyebrow}>Health</p>
        {checks.length ? (
          <ul className="mt-3 space-y-2">
            {checks.map(([label, ok]) => (
              <li key={String(label)} className={t.row}>
                <span className="text-sm text-[var(--graphite-text-body)]">{label}</span>
                <span className={ok ? t.badgeInfo : t.badgeCritical}>{ok ? "ready" : "missing"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`mt-3 ${t.emptyNote}`}>Health checks are not loaded.</p>
        )}
      </section>

      <section className={t.card}>
        <p className={t.eyebrow}>Work</p>
        <ul className="mt-3 space-y-2">
          {JUMPS.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => setActiveTab(item.id)} className={`${t.row} w-full text-left`}>
                <span className="text-sm text-[var(--graphite-text-body)]">{item.label}</span>
                <span className="text-sm text-[var(--graphite-primary)]">»</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
