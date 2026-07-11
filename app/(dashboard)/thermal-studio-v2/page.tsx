import Link from "next/link";
import { loadThermalSessionList } from "@/lib/thermal/load-session-data";

/**
 * TS-SD/TS-PROJ index — lists real thermal sessions so the CEO can open one
 * in the real V2 route (mirrors V1's /thermal-studio list). Session
 * creation + project picker stay on V1's /thermal-studio/upload for now —
 * V2 hasn't rebuilt session creation yet; that's a separate, larger feature
 * than TS-SD/TS-PROJ's "linking + re-open" scope. Logged as a known gap.
 */
export default async function ThermalStudioV2IndexPage() {
  const sessions = await loadThermalSessionList(null);

  return (
    <div className="mx-auto max-w-4xl space-y-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-bold text-[var(--graphite-text-header)]">Thermal Studio V2</h1>
        <Link
          href="/thermal-studio/upload"
          className="rounded-md border border-[var(--mobile-app-card-border)] px-3 py-1.5 text-xs font-semibold text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)]"
        >
          New inspection
        </Link>
      </div>
      {sessions.length ? (
        <div className="flex flex-col gap-2">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/thermal-studio-v2/${session.id}`}
              className="flex items-center justify-between gap-3 rounded-md border border-[var(--mobile-app-card-border)] p-3 transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)]"
            >
              <div>
                <p className="font-semibold text-[var(--graphite-text-header)]">{session.name}</p>
                <p className="mt-1 text-xs capitalize text-[var(--graphite-muted)]">
                  {session.status} · {new Date(session.created_at).toLocaleString()}
                </p>
              </div>
              <span className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-xs text-[var(--graphite-text-header)]">Open</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--graphite-muted)]">No thermal sessions yet.</p>
      )}
    </div>
  );
}
