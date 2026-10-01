/**
 * ShareGate — password prompt for password-protected share links. On a correct
 * password the unlock route returns a presigned URL + metadata, and we hand off
 * to ShareViewer. The file is never presigned until the password is verified.
 */
"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { ExternalPortalShell, PortalGlassCard } from "@/components/external-portal";
import ShareViewer from "./ShareViewer";

type UnlockedFile = {
  fileName: string;
  fileType: string;
  fileSize: number;
  presignedUrl: string;
  canDownload: boolean;
};

export default function ShareGate({ token, badge }: { token: string; badge?: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState<UnlockedFile | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!password.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/${token}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.presignedUrl) {
        setUnlocked(data as UnlockedFile);
      } else {
        setError(data.error ?? "Could not unlock this file.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (unlocked) {
    return (
      <ShareViewer
        fileName={unlocked.fileName}
        fileType={unlocked.fileType}
        fileSize={unlocked.fileSize}
        presignedUrl={unlocked.presignedUrl}
        canDownload={unlocked.canDownload}
      />
    );
  }

  return (
    <ExternalPortalShell portalLabel={badge ?? "Secure sharing"} title="Password required">
      <div className="mx-auto w-full max-w-md">
        <PortalGlassCard>
          <div className="mb-5 flex flex-col items-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--portal-accent)_14%,transparent)]">
              <Lock size={22} className="text-[var(--portal-accent)]" />
            </span>
            <h2 className="text-lg font-bold text-[var(--portal-ink)]">This file is protected</h2>
            <p className="mt-1 text-sm text-[var(--portal-ink-muted)]">
              Enter the password the sender shared with you to view this file.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full rounded-xl border border-[var(--portal-line)] bg-[var(--portal-canvas-alt)] px-3.5 py-2.5 text-sm text-[var(--portal-ink)] placeholder-[var(--portal-ink-muted)] outline-none transition-all focus:border-[var(--portal-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--portal-accent)_20%,transparent)]"
            />
            {error && <p className="text-xs font-medium text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={!password.trim() || loading}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--portal-accent)" }}
            >
              {loading ? "Unlocking…" : "Unlock"}
            </button>
          </form>
        </PortalGlassCard>
      </div>
    </ExternalPortalShell>
  );
}
