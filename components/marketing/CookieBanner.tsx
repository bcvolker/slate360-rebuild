"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "slate360_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(CONSENT_KEY) !== "accepted");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function accept() {
    try {
      window.localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      // ignore storage failures
    }
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className={cn(
        "fixed inset-x-0 bottom-0 z-[100] border-t border-[var(--mkt-line)] bg-[var(--mkt-surface)]/95 px-4 py-4 backdrop-blur-xl",
        "pb-[max(1rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[var(--mkt-ink-muted)]">
          Slate360 uses essential cookies for authentication and session management. See our{" "}
          <Link href="/privacy" className="font-medium text-[var(--mkt-accent)] underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-[10px] bg-[var(--mkt-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-110"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
