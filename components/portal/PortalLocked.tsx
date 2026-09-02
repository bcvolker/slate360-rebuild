"use client";

import { Lock } from "lucide-react";

/** "Link revoked/expired" state — same denial shape whether the token never
 * existed, was revoked, expired, or hit its view cap, so nothing here can be
 * used to distinguish those cases. See SECURITY_MODEL.md. */
export function PortalDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#0B0F15] px-4 text-center">
      <Lock className="h-6 w-6 text-white/40" />
      <p className="text-sm text-white/70">This link is no longer available.</p>
    </div>
  );
}

export function PortalPasswordGate({
  password,
  onPassword,
  error,
  onSubmit,
}: {
  password: string;
  onPassword: (value: string) => void;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0B0F15] px-4">
      <Lock className="h-6 w-6 text-white/60" />
      <p className="text-sm text-white/80">This project requires an access code.</p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <input
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          type="password"
          placeholder="Access code"
          className="min-h-11 rounded-lg border border-white/15 bg-white/5 px-3 text-center text-sm text-white outline-none focus:border-white/40"
        />
        {error ? <p className="text-center text-xs text-red-400">{error}</p> : null}
        <button type="button" onClick={onSubmit} className="min-h-11 rounded-lg bg-white px-4 text-sm font-semibold text-black">
          Continue
        </button>
      </div>
    </div>
  );
}
