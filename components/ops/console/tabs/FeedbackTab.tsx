"use client";

import { useOpsConsoleStore } from "@/lib/stores/useOpsConsoleStore";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";

function statusBadge(status: string): string {
  if (status === "new") return t.badgeInfo;
  if (status === "blocker" || status === "critical") return t.badgeCritical;
  return t.badgeMuted;
}

export function FeedbackTab() {
  const { feedback, pendingUsers } = useOpsConsoleStore();

  return (
    <div className="space-y-4">
      <div className={t.card}>
        <p className={t.eyebrow}>Pending access approvals ({pendingUsers.length})</p>
        {pendingUsers.length ? (
          <ul className="mt-3 space-y-2">
            {pendingUsers.map((u) => (
              <li key={u.id} className={t.row}>
                <span className="truncate text-sm text-[var(--graphite-text-header)]">{u.email}</span>
                <span className="text-xs text-[var(--graphite-muted)]">
                  {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`mt-3 ${t.emptyNote}`}>No accounts awaiting approval.</p>
        )}
        <p className={`mt-3 ${t.emptyNote}`}>Approve/deny actions ship in the next slice.</p>
      </div>

      <div className={t.card}>
        <p className={t.eyebrow}>Beta feedback ({feedback.length})</p>
        {feedback.length ? (
          <ul className="mt-3 space-y-2">
            {feedback.map((f) => (
              <li key={f.id} className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-[var(--graphite-text-header)]">{f.title}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={t.badgeMuted}>{f.type}</span>
                    <span className={statusBadge(f.status)}>{f.status}</span>
                  </div>
                </div>
                {f.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--graphite-muted)]">{f.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={`mt-3 ${t.emptyNote}`}>No feedback yet.</p>
        )}
        <p className={`mt-3 ${t.emptyNote}`}>Status transitions &amp; assignment ship in the next slice.</p>
      </div>
    </div>
  );
}
