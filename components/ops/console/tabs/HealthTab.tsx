"use client";

import { useOpsConsoleStore } from "@/lib/stores/useOpsConsoleStore";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";

function HealthRow({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <li className={t.row}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--graphite-text-header)]">{label}</p>
        <p className="text-xs text-[var(--graphite-muted)]">{hint}</p>
      </div>
      <span className={ok ? t.badgeInfo : t.badgeCritical}>{ok ? "configured" : "missing"}</span>
    </li>
  );
}

export function HealthTab() {
  const { health } = useOpsConsoleStore();

  if (!health) {
    return (
      <div className={t.card}>
        <p className={t.emptyNote}>System health is available to the owner account only.</p>
      </div>
    );
  }

  return (
    <div className={t.card}>
      <p className={t.eyebrow}>Integrations &amp; environment</p>
      <ul className="mt-3 space-y-2">
        <HealthRow label="Stripe secret key" ok={health.stripe} hint="Required for checkout & billing" />
        <HealthRow label="Stripe webhook secret" ok={health.stripeWebhook} hint="Activates subscriptions after payment" />
        <HealthRow label="Supabase URL" ok={health.supabase} hint="Database & auth endpoint" />
        <HealthRow label="Supabase service role key" ok={health.supabaseService} hint="Server-side admin access" />
        <HealthRow label="App URL" ok={health.appUrl} hint="Used for checkout return URLs" />
      </ul>
      <p className={`mt-3 ${t.emptyNote}`}>
        Booleans only — secret values are never exposed. Set missing values in Vercel environment variables.
      </p>
    </div>
  );
}
