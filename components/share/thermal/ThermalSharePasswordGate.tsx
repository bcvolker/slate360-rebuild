"use client";

import { useState } from "react";

type Props = {
  token: string;
  embed?: boolean;
};

export function ThermalSharePasswordGate({ token, embed = false }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/thermal/${token}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Invalid password");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className={`flex items-center justify-center bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)] ${embed ? "p-4" : "min-h-screen px-6"}`}
    >
      <form onSubmit={unlock} className="w-full max-w-md rounded-2xl border border-[var(--mobile-app-card-border)] p-6">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--graphite-muted)]">Protected link</p>
        <h1 className="mt-2 text-xl font-bold text-[var(--graphite-text-header)]">Enter password</h1>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-4 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-[var(--graphite-primary)]"
          placeholder="Share password"
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-4 w-full rounded-full bg-[var(--graphite-primary)] px-4 py-3 text-sm font-semibold text-[#0B0F15] disabled:opacity-50"
        >
          {busy ? "Checking…" : "View inspection"}
        </button>
        {error ? <p className="mt-3 text-xs text-[#fca5a5]">{error}</p> : null}
      </form>
    </main>
  );
}
