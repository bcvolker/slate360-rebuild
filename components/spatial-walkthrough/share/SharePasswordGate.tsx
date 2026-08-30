"use client";

import { useState } from "react";

type Props = {
  onSubmit: (code: string) => void;
  error?: string | null;
};

export function SharePasswordGate({ onSubmit, error }: Props) {
  const [code, setCode] = useState("");
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--graphite-canvas)] px-6 text-[var(--graphite-text-header)]">
      <form
        className="w-full max-w-sm space-y-4 border border-white/10 bg-white/[0.04] p-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(code);
        }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
          Spatial Walkthrough
        </p>
        <h1 className="text-lg font-semibold">Access code required</h1>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-12 w-full border border-white/10 bg-transparent px-3"
          autoComplete="off"
          aria-label="Access code"
        />
        {error ? <p className="text-sm text-[var(--graphite-text-header)]">{error}</p> : null}
        <button type="submit" className="h-12 w-full border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] text-[var(--graphite-primary)]">
          Continue
        </button>
      </form>
    </div>
  );
}
