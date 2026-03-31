"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

type AppId = "tour_builder" | "punchwalk";

const APPS: { id: AppId; name: string; price: string; description: string }[] = [
  {
    id: "tour_builder",
    name: "Tour Builder",
    price: "$49/mo",
    description: "Create and host 360° virtual tours for your projects.",
  },
  {
    id: "punchwalk",
    name: "PunchWalk",
    price: "$49/mo",
    description: "Punch list and field walkthrough app.",
  },
];

export default function AppsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<AppId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const billingState = searchParams.get("app_billing");
  const appParam = searchParams.get("app");
  const completedApp = appParam === "tour_builder" || appParam === "punchwalk" ? appParam : null;
  const appLabel = completedApp === "tour_builder" ? "Tour Builder" : completedApp === "punchwalk" ? "PunchWalk" : "selected app";

  async function handleSubscribe(appId: AppId) {
    setLoading(appId);
    setError(null);

    try {
      const res = await fetch("/api/billing/app-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Checkout failed");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Network error — are you running the dev server?");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Slate360 Apps</h1>
        <p className="text-sm text-gray-500 mb-8">
          Subscribe to standalone apps — no platform tier required.
        </p>

        {billingState === "success" && completedApp && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Stripe Checkout completed for {appLabel}. If the webhook listener is running, verify the new subscription in Stripe,
            confirm the `org_feature_flags` update in Supabase, then refresh protected routes to validate standalone access.
          </div>
        )}

        {billingState === "cancelled" && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Stripe Checkout was cancelled before payment completion.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {APPS.map((app) => (
            <div
              key={app.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-gray-900">{app.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{app.description}</p>
              <p className="mt-3 text-2xl font-bold text-[#FF4D00]">{app.price}</p>

              <button
                onClick={() => handleSubscribe(app.id)}
                disabled={loading !== null}
                className="mt-4 w-full rounded-xl bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white
                           hover:bg-[#E64500] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === app.id ? "Redirecting to Stripe…" : `Subscribe to ${app.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
