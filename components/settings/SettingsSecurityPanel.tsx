"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ShieldCheck, X } from "lucide-react";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";
import { settingsTokens } from "./settings-tokens";
import { passwordStrengthScore, validatePassword } from "./settings-validation";
import { SettingsField, SettingsPanelHeader } from "./SettingsShared";
import { SettingsSecuritySessions } from "./SettingsSecuritySessions";

type Props = {
  sessions: DashboardAccountOverview["sessions"];
  onUpdatePassword: (password: string) => Promise<void>;
};

export function SettingsSecurityPanel({ sessions, onUpdatePassword }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = passwordStrengthScore(password);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await onUpdatePassword(password);
      setPassword("");
      setConfirm("");
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <SettingsPanelHeader
        icon={ShieldCheck}
        eyebrow="Security"
        title="Password & sessions"
        description="Change your password or use the email reset flow if you are signed out."
      />

      <div className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,white_4%,var(--surface-zinc))] px-4 py-4">
        <p className="text-sm font-semibold text-[var(--graphite-text-header)]">Password</p>
        <p className="mt-1 text-xs font-medium text-[var(--graphite-muted)]">
          Use a strong password with mixed case, numbers, and symbols.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={settingsTokens.primaryButton} onClick={() => setModalOpen(true)}>
            Change password
          </button>
          <Link href="/forgot-password" className={settingsTokens.ghostButton}>
            Email reset link
          </Link>
        </div>
      </div>

      <SettingsSecuritySessions sessions={sessions} />

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] p-4 backdrop-blur-sm sm:items-center">
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className={settingsTokens.eyebrow}>Security</p>
                <h3 id="password-modal-title" className={settingsTokens.title}>
                  Change password
                </h3>
              </div>
              <button
                type="button"
                className={settingsTokens.ghostButton}
                onClick={() => {
                  setModalOpen(false);
                  setError(null);
                }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <SettingsField label="New password">
                <div className="relative">
                  <input
                    className={settingsTokens.fieldInput}
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--graphite-muted)]"
                    onClick={() => setShow((value) => !value)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </SettingsField>
              <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,white_8%,var(--surface-zinc))]">
                <div
                  className="h-full rounded-full bg-[var(--graphite-primary)] transition-all"
                  style={{ width: `${(strength / 5) * 100}%` }}
                />
              </div>
              <SettingsField label="Confirm password">
                <input
                  className={settingsTokens.fieldInput}
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="new-password"
                />
              </SettingsField>
              {error ? <p className={settingsTokens.statusError}>{error}</p> : null}
              <button type="submit" className={settingsTokens.primaryButton} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Update password
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
