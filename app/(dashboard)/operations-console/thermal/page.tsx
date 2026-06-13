import Link from "next/link";
import { loadThermalSessionList } from "@/lib/thermal/load-session-data";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

export default async function ThermalSessionsPage() {
  const sessions = await loadThermalSessionList(null);

  return (
    <div className="space-y-4">
      {sessions.length ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/operations-console/thermal/${session.id}`}
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
          <Link href="/operations-console/thermal/upload" className={`${t.primaryButton} mt-4 inline-flex`}>
            Start first session
          </Link>
        </div>
      )}
    </div>
  );
}
