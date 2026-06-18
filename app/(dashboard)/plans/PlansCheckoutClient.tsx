"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Initiates Stripe Checkout for the selected homepage plan + billing cycle.
 * The homepage CTAs link to /signup?plan=<slug>&billing=<cycle>, which forwards
 * here after auth. We POST to /api/billing/app-checkout (which maps the slug,
 * applies the 14-day trial, and picks the monthly/annual price) then redirect
 * to Stripe's hosted checkout.
 */
export function PlansCheckoutClient({
  plan,
  billing,
}: {
  plan: string;
  billing: "monthly" | "annual";
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/app-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, billing }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.url) {
          if (!cancelled) setError(data?.error ?? "We couldn't start checkout. Please try again.");
          return;
        }
        window.location.href = data.url;
      } catch {
        if (!cancelled) setError("Network error starting checkout. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan, billing]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      {error ? (
        <>
          <p className="text-sm text-red-400">{error}</p>
          <Link
            href="/#pricing"
            className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-[var(--graphite-text-header)] hover:bg-white/5"
          >
            Back to plans
          </Link>
        </>
      ) : (
        <>
          <Loader2 size={24} className="animate-spin text-[var(--graphite-primary)]" />
          <p className="text-sm text-[var(--graphite-muted)]">Taking you to secure checkout…</p>
        </>
      )}
    </div>
  );
}
