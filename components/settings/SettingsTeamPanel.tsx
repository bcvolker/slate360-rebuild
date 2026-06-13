"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus, UsersRound, X } from "lucide-react";
import type { TeamOverview } from "./settings-types";
import { settingsTokens } from "./settings-tokens";
import { SettingsPanelHeader } from "./SettingsShared";

type Props = {
  overview: TeamOverview | null;
  loading: boolean;
  error: string | null;
  canInvite: boolean;
  isSlateCeo: boolean;
  onRefresh: () => void;
  onInvite: (email: string) => Promise<void>;
};

function formatRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatLastActive(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SettingsTeamPanel({
  overview,
  loading,
  error,
  canInvite,
  isSlateCeo,
  onRefresh,
  onInvite,
}: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const members = overview?.members ?? [];
  const seatCount = overview?.seatCount ?? 0;
  const maxSeats = overview?.maxSeats ?? 0;

  async function submitInvite(event: React.FormEvent) {
    event.preventDefault();
    setInviteError(null);
    setBusy(true);
    try {
      await onInvite(email.trim().toLowerCase());
      setEmail("");
      setInviteOpen(false);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Could not invite member.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <SettingsPanelHeader
        icon={UsersRound}
        eyebrow="Team"
        title="Team overview"
        description="Workspace members, seat usage, and invitations."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--graphite-text-header)]">
          {seatCount} members · {seatCount}/{maxSeats || "—"} seats used
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={settingsTokens.ghostButton} onClick={onRefresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Refresh
          </button>
          {canInvite ? (
            <button type="button" className={settingsTokens.primaryButton} onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Invite member
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className={settingsTokens.statusError}>{error}</p> : null}
      {isSlateCeo ? (
        <p className="mb-4 text-xs font-medium text-[var(--graphite-muted)]">
          Need the full directory?{" "}
          <Link href="/operations-console" className="text-[var(--graphite-primary)] underline-offset-2 hover:underline">
            Open Operations Console
          </Link>
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm font-medium text-[var(--graphite-muted)]">Loading team members…</p>
      ) : members.length === 0 ? (
        <p className="text-sm font-medium text-[var(--graphite-muted)]">
          No team members yet — invite your first collaborator.
        </p>
      ) : (
        <ul className="space-y-2 lg:hidden">
          {members.map((member) => (
            <li key={member.userId} className={settingsTokens.toggleRow}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">
                  {member.name}
                  {member.isSelf ? " (you)" : ""}
                </p>
                <p className="truncate text-xs font-medium text-[var(--graphite-muted)]">
                  {formatRole(member.role)} · {member.email || "No email"} · Active {formatLastActive(member.lastActive)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && members.length > 0 ? (
        <div className="hidden overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)] lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-[color-mix(in_srgb,white_4%,var(--surface-zinc))] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
              <tr>
                <th className="px-3 py-2">Member</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Last active</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId} className="border-t border-[var(--mobile-app-card-border)]">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[var(--graphite-text-header)]">
                      {member.name}
                      {member.isSelf ? " (you)" : ""}
                    </p>
                    <p className="text-xs text-[var(--graphite-muted)]">{member.email || "—"}</p>
                  </td>
                  <td className="px-3 py-3 text-[var(--graphite-text-body)]">{formatRole(member.role)}</td>
                  <td className="px-3 py-3 text-[var(--graphite-muted)]">{formatLastActive(member.lastActive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {inviteOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] p-4 backdrop-blur-sm sm:items-center">
          <form
            className="w-full max-w-md rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] p-5"
            onSubmit={submitInvite}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className={settingsTokens.eyebrow}>Team</p>
                <h3 className={settingsTokens.title}>Invite member</h3>
              </div>
              <button type="button" className={settingsTokens.ghostButton} onClick={() => setInviteOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block">
              <span className={settingsTokens.sectionLabel}>Email</span>
              <input
                className={`${settingsTokens.fieldInput} mt-1.5`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
              />
            </label>
            {inviteError ? <p className={`${settingsTokens.statusError} mt-3`}>{inviteError}</p> : null}
            <button type="submit" className={`${settingsTokens.primaryButton} mt-4`} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send invite
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
