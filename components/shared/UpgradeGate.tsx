"use client";

import Link from "next/link";
import { Lock, ArrowUpRight } from "lucide-react";
import type { Tier } from "@/lib/entitlements";
import { getUpgradeUrl } from "@/lib/billing";

const TIER_LABELS: Record<Tier, string> = {
  trial: "Trial",
  standard: "Standard",
  business: "Business",
  enterprise: "Enterprise",
};

interface UpgradeGateProps {
  feature: string;
  requiredTier: Tier;
  currentTier: Tier;
  /** Optional accent color for the feature icon frame */
  accent?: string;
  /** Optional icon component to display */
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export default function UpgradeGate({
  feature,
  requiredTier,
  currentTier,
  accent = "#3B82F6",
  icon: Icon,
}: UpgradeGateProps) {
  return (
    <div className="relative rounded-2xl border border-app bg-app-card/60 p-8 sm:p-12 text-center backdrop-blur-sm">
      {/* Lock badge */}
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-app">
        {Icon ? (
          <div className="relative">
            <Icon size={24} className="text-zinc-500" />
            <Lock size={12} className="absolute -bottom-1 -right-1 text-zinc-400" />
          </div>
        ) : (
          <Lock size={24} className="text-zinc-400" />
        )}
      </div>

      {/* Copy */}
      <h2 className="text-lg font-bold text-foreground mb-2">
        {feature} requires {TIER_LABELS[requiredTier]}
      </h2>
      <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
        You&apos;re on the <span className="font-semibold text-zinc-300">{TIER_LABELS[currentTier]}</span> plan.
        Upgrade to <span className="font-semibold" style={{ color: accent }}>{TIER_LABELS[requiredTier]}</span> or
        higher to unlock {feature} and all its capabilities.
      </p>

      {/* CTA */}
      <Link
        href={getUpgradeUrl()}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:opacity-90"
        style={{ backgroundColor: accent }}
      >
        View Plans <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}
