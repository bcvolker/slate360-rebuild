"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Check } from "lucide-react";

interface PlanEntitlement {
  id: string;
  name: string;
  price: string;
  interval: string;
  activeOrgs: number;
  features: string[];
  entitlementsJson: string;
}

export function PlansPricingTab() {
  const [plans, setPlans] = useState<PlanEntitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/operations/plans");
      if (cancelled) return;
      if (!res.ok) {
        setError("Failed to load plans");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { plans?: PlanEntitlement[] };
      setPlans(data.plans ?? []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-cobalt" />
      </div>
    );
  }
  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Active Plans &amp; Entitlements</h2>
        <button
          disabled
          className="bg-cobalt/60 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
          title="Phase 2"
        >
          Simulate Pricing
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-card border border-border rounded-xl p-6 flex flex-col hover:border-cobalt transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted/30 rounded-lg flex items-center justify-center text-muted-foreground">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{plan.name}</h3>
                <div className="text-sm font-bold text-cobalt">
                  {plan.price}{" "}
                  <span className="text-xs text-muted-foreground font-normal">/{plan.interval}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground mb-4 bg-muted/20 p-2 rounded border border-border flex items-center justify-between">
              <span>Active Subscriptions</span>
              <span className="font-bold text-foreground">{plan.activeOrgs}</span>
            </div>

            <div className="flex-1 space-y-2 mb-6">
              {plan.features.map((feat) => (
                <div key={feat} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Entitlements JSON</p>
              <pre className="bg-background border border-border rounded-lg p-3 text-[10px] text-muted-foreground overflow-x-auto">
                {plan.entitlementsJson}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
