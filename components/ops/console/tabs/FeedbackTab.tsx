"use client";

import { useOpsConsoleStore } from "@/lib/stores/useOpsConsoleStore";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";

const FEEDBACK_STATUSES = ["new", "triaged", "in_progress", "resolved", "wontfix"] as const;

function statusBadge(status: string): string {
  if (status === "new") return t.badgeInfo;
  if (status === "wontfix") return t.badgeCritical;
  return t.badgeMuted;
}

export function FeedbackTab() {
  const { feedback, pendingUsers, isCeo, busy, updateFeedbackStatus, approveUser } = useOpsConsoleStore();

  return (
    <div className="space-y-4">
      <div className={t.card}>
        <p className={t.eyebrow}>Pending access approvals ({pendingUsers.length})</p>
        {pendingUsers.length ? (
          <ul className="mt-3 space-y-2">
            {pendingUsers.map((u) => (
              <li key={u.id} className={t.row}>
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--graphite-text-header)]">{u.email}</p>
                  <p className="text-xs text-[var(--graphite-muted)]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {isCeo ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" className={t.primaryButton} disabled={busy} onClick={() => approveUser(u.id, true)}>
                      Approve
                    </button>
                    <button type="button" className={t.secondaryButton} disabled={busy} onClick={() => approveUser(u.id, false)}>
                      Deny
                    </button>
                  </div>
                ) : (
                  <span className={t.badgeMuted}>owner approves</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={`mt-3 ${t.emptyNote}`}>No accounts awaiting approval.</p>
        )}
      </div>

      <div className={t.card}>
        <p className={t.eyebrow}>Beta feedback ({feedback.length})</p>
        {feedback.length ? (
          <ul className="mt-3 space-y-2">
            {feedback.map((f) => (
              <li
                key={f.id}
                className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-4 py-3"
              >
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
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-[var(--graphite-muted)]">Status</label>
                  <select
                    value={f.status}
                    disabled={busy}
                    onChange={(e) => updateFeedbackStatus(f.id, e.target.value)}
                    className={`${t.input} h-9 max-w-[10rem]`}
                  >
                    {FEEDBACK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`mt-3 ${t.emptyNote}`}>No feedback yet.</p>
        )}
      </div>
    </div>
  );
}
