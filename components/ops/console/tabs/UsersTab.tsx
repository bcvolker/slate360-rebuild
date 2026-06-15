"use client";

import { useEffect, useState } from "react";
import { useOpsConsoleStore } from "@/lib/stores/useOpsConsoleStore";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";

export function UsersTab() {
  const { subscribers, subscribersLoaded, busy, fetchSubscribers } = useOpsConsoleStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    void fetchSubscribers();
  }, [fetchSubscribers]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? subscribers.filter(
        (s) =>
          s.email.toLowerCase().includes(q) ||
          s.orgName.toLowerCase().includes(q) ||
          s.displayName.toLowerCase().includes(q),
      )
    : subscribers;

  return (
    <div className="space-y-4">
      <div className={t.card}>
        <div className="flex items-center justify-between gap-3">
          <p className={t.eyebrow}>Users &amp; organizations</p>
          <input
            type="search"
            placeholder="Search email, name, or org…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${t.input} max-w-xs`}
          />
        </div>

        {busy && !subscribersLoaded ? (
          <p className={`mt-4 ${t.emptyNote}`}>Loading subscribers…</p>
        ) : filtered.length ? (
          <ul className="mt-4 space-y-2">
            {filtered.map((s) => (
              <li key={s.id} className={t.row}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--graphite-text-header)]">{s.displayName}</p>
                  <p className="truncate text-xs text-[var(--graphite-muted)]">{s.email} · {s.orgName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={t.badgeMuted}>{s.role}</span>
                  <span className={t.badgeInfo}>{s.tier}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`mt-4 ${t.emptyNote}`}>
            {subscribersLoaded ? "No matching users." : "No subscribers loaded."}
          </p>
        )}
      </div>
    </div>
  );
}
