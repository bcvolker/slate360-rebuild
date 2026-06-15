"use client";

import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";

export function ContentTab() {
  return (
    <div className={t.card}>
      <p className={t.eyebrow}>Content &amp; marketing</p>
      <p className="mt-2 text-sm text-[var(--graphite-text-body)]">
        Manage homepage hero, feature tiles, and Learn More assets without redeploys.
      </p>
      <p className={`mt-1 ${t.emptyNote}`}>
        Not yet wired — needs a content-assets store + upload endpoint. Ships in a later slice.
      </p>
    </div>
  );
}
