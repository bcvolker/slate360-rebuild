import Link from "next/link";
import { loadThermalSessionList } from "@/lib/thermal/load-session-data";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

function actionAnomalyCount(summary: Record<string, unknown> | null | undefined): number {
  return Number(summary?.critical_anomalies ?? 0);
}

export default async function ThermalSessionsPage() {
  const sessions = await loadThermalSessionList(null);
  const reviewQueue = sessions.filter((session) => {
    const summary = (session.summary_metrics as Record<string, unknown> | undefined) ?? {};
    return actionAnomalyCount(summary) > 0;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-bold text-[var(--graphite-text-header)]">Thermal Studio</h1>
        <div className="flex items-center gap-2">
          <Link href="/thermal-studio/report-templates" className={t.secondaryButton}>
            Report templates
          </Link>
          <Link href="/thermal-studio/upload" className={t.primaryButton}>
            New upload
          </Link>
        </div>
      </div>
      {sessions.length ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/thermal-studio/${session.id}`}
              className={`block ${t.card} transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)]`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--graphite-text-header)]">{session.name}</p>
                  <p className="mt-1 text-xs capitalize text-[var(--graphite-muted)]">
                    {session.status} · {new Date(session.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={t.secondaryButton}>Open</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={t.card}>
          <p className="text-sm text-[var(--graphite-muted)]">
            No thermal sessions yet. Upload drone radiometric files to begin.
          </p>
          <Link href="/thermal-studio/upload" className={`${t.primaryButton} mt-4 inline-flex`}>
            Start first session
          </Link>
        </div>
      )}

      {reviewQueue.length ? (
        <div className={t.card}>
          <p className={t.eyebrow}>Review queue</p>
          <p className="mt-2 text-sm text-[var(--graphite-muted)]">
            Sessions with action-severity anomalies from the latest pipeline run.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {reviewQueue.map((session) => {
              const summary = (session.summary_metrics as Record<string, unknown> | undefined) ?? {};
              return (
                <li key={session.id}>
                  <Link
                    href={`/thermal-studio/${session.id}`}
                    className="text-[var(--graphite-primary)] hover:underline"
                  >
                    {session.name}
                  </Link>
                  <span className="text-[var(--graphite-muted)]">
                    {" "}
                    · {actionAnomalyCount(summary)} action anomal
                    {actionAnomalyCount(summary) === 1 ? "y" : "ies"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
