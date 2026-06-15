"use client";

import { useState } from "react";
import { useOpsConsoleStore } from "@/lib/stores/useOpsConsoleStore";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";

const SCOPES = ["market", "athlete360"] as const;

export function StaffTab() {
  const { staff, busy, grantStaff, revokeStaff } = useOpsConsoleStore();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["market"]);

  const active = staff.filter((s) => !s.revokedAt);
  const revoked = staff.filter((s) => s.revokedAt);

  async function handleGrant() {
    if (!email.includes("@")) return;
    const ok = await grantStaff({ email, displayName: displayName || undefined, accessScope: scopes });
    if (ok) {
      setEmail("");
      setDisplayName("");
      setScopes(["market"]);
    }
  }

  function toggleScope(scope: string) {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }

  return (
    <div className="space-y-4">
      <div className={t.card}>
        <p className={t.eyebrow}>Grant staff access</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input className={t.input} placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={t.input} placeholder="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {SCOPES.map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => toggleScope(scope)}
              className={scopes.includes(scope) ? t.badgeInfo : t.badgeMuted}
            >
              {scope}
            </button>
          ))}
          <button type="button" className={`${t.primaryButton} ml-auto`} disabled={busy || !email.includes("@")} onClick={handleGrant}>
            Grant access
          </button>
        </div>
      </div>

      <div className={t.card}>
        <p className={t.eyebrow}>Active staff ({active.length})</p>
        {active.length ? (
          <ul className="mt-3 space-y-2">
            {active.map((s) => (
              <li key={s.id} className={t.row}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--graphite-text-header)]">{s.displayName ?? s.email}</p>
                  <p className="truncate text-xs text-[var(--graphite-muted)]">{s.email} · {s.accessScope.join(", ") || "no scopes"}</p>
                </div>
                <button type="button" className={t.secondaryButton} disabled={busy} onClick={() => revokeStaff(s.id)}>
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`mt-3 ${t.emptyNote}`}>No active staff grants.</p>
        )}
      </div>

      {revoked.length ? (
        <div className={t.card}>
          <p className={t.eyebrow}>Revoked ({revoked.length})</p>
          <ul className="mt-3 space-y-2">
            {revoked.map((s) => (
              <li key={s.id} className={t.row}>
                <span className="truncate text-sm text-[var(--graphite-muted)]">{s.email}</span>
                <span className={t.badgeMuted}>revoked</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
