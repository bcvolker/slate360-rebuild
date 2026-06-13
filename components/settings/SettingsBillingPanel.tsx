"use client";

import Link from "next/link";
import { CreditCard, Loader2 } from "lucide-react";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";
import { BillingPortalButton } from "@/components/account/BillingPortalButton";
import { settingsTokens } from "./settings-tokens";
import { SettingsMetric, SettingsPanelHeader } from "./SettingsShared";
import { SettingsBuyCreditsButton } from "./SettingsBuyCreditsButton";

type Props = {
  overview: DashboardAccountOverview | null;
  loading: boolean;
  error: string | null;
  billingDisabledReason?: string;
  isSlateCeo?: boolean;
  onRefresh: () => void;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function StorageRing({ usedGb, limitGb }: { usedGb: number; limitGb: number }) {
  const percent = limitGb > 0 ? Math.min(100, Math.round((usedGb / limitGb) * 100)) : 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,white_4%,var(--surface-zinc))] px-4 py-4">
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden>
        <circle cx="44" cy="44" r={radius} fill="none" stroke="color-mix(in srgb, white 8%, var(--surface-zinc))" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="var(--graphite-primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="48" textAnchor="middle" fill="var(--graphite-text-header)" fontSize="14" fontWeight="700">
          {percent}%
        </text>
      </svg>
      <div>
        <p className={settingsTokens.sectionLabel}>Storage used</p>
        <p className="mt-1 text-sm font-semibold text-[var(--graphite-text-header)]">
          {usedGb.toFixed(1)} / {limitGb} GB
        </p>
      </div>
    </div>
  );
}

export function SettingsBillingPanel({
  overview,
  loading,
  error,
  billingDisabledReason,
  isSlateCeo,
  onRefresh,
}: Props) {
  const billing = overview?.billing;
  const usage = overview?.usage;
  const lowCredits =
    billing && billing.totalCreditsBalance <= 0 && billing.purchasedCredits <= 0;

  return (
    <section>
      <SettingsPanelHeader
        icon={CreditCard}
        eyebrow="Subscription"
        title="Billing & credits"
        description="Plan summary, credit balance, and Stripe self-service."
      />

      <div className="mb-4 flex justify-end">
        <button type="button" className={settingsTokens.ghostButton} onClick={onRefresh} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Refresh
        </button>
      </div>

      {error ? <p className={settingsTokens.statusError}>{error}</p> : null}
      {lowCredits ? (
        <p className={settingsTokens.statusError}>
          Insufficient credits for Twin processing. Top up to continue processing jobs.
        </p>
      ) : null}

      {!loading && !usage?.projectsCount && !billing?.totalCreditsBalance ? (
        <p className="mb-4 text-sm font-medium text-[var(--graphite-muted)]">
          No usage yet — start a Site Walk to begin tracking storage and credits.
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(220px,0.4fr)_1fr]">
        {usage ? <StorageRing usedGb={usage.storageUsedGb} limitGb={usage.storageLimitGb} /> : null}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <SettingsMetric label="Plan" value={billing?.plan ?? "—"} />
          <SettingsMetric label="Status" value={billing ? formatStatus(billing.status) : "—"} />
          <SettingsMetric label="Renews" value={formatDate(billing?.renewsOn ?? null)} />
          <SettingsMetric
            label="Purchased credits"
            value={billing ? billing.purchasedCredits.toLocaleString() : "—"}
          />
          <SettingsMetric
            label="Credit balance"
            value={billing ? billing.totalCreditsBalance.toLocaleString() : "—"}
          />
          <SettingsMetric label="Projects" value={usage ? String(usage.projectsCount) : "—"} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <SettingsBuyCreditsButton disabledReason={billingDisabledReason} />
        {isSlateCeo ? (
          <Link href="/operations-console" className={settingsTokens.ghostButton}>
            View CEO metrics
          </Link>
        ) : null}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)]">
        <BillingPortalButton disabledReason={billingDisabledReason} />
      </div>
    </section>
  );
}
