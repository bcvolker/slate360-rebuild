"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Users2,
  TrendingUp,
  Shield,
  Layers,
} from "lucide-react";

type PlatformOverview = {
  totalOrgs: number;
  totalUsers: number;
  tierBreakdown: Record<string, number>;
  activeStaff: number;
};

const TIER_COLORS: Record<string, string> = {
  trial: "#9CA3AF",
  standard: "#60A5FA",
  business: "#F97316",
  enterprise: "#6366F1",
};

export default function CeoPlatformOverview() {
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ceo/overview", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData({
          totalOrgs: json.totalOrgs ?? 0,
          totalUsers: json.totalUsers ?? 0,
          tierBreakdown: json.tierBreakdown ?? {},
          activeStaff: json.activeStaff ?? 0,
        });
      }
    } catch {
      // Fail silently — metrics are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = [
    {
      label: "Organizations",
      value: data?.totalOrgs ?? 0,
      icon: Building2,
      accent: "#F59E0B",
    },
    {
      label: "Total Users",
      value: data?.totalUsers ?? 0,
      icon: Users2,
      accent: "#60A5FA",
    },
    {
      label: "Active Staff",
      value: data?.activeStaff ?? 0,
      icon: Shield,
      accent: "#FF6B35",
    },
    {
      label: "Tier Plans",
      value: Object.keys(data?.tierBreakdown ?? {}).length,
      icon: Layers,
      accent: "#8B5CF6",
    },
  ];

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
        Platform Overview
      </h2>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.label}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div
                    className="mb-2 inline-flex rounded-lg p-2"
                    style={{ backgroundColor: `${item.accent}15` }}
                  >
                    <Icon size={14} color={item.accent} />
                  </div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-black text-gray-900">
                    {item.value.toLocaleString()}
                  </p>
                </article>
              );
            })}
          </div>

          {/* Tier distribution */}
          {data && Object.keys(data.tierBreakdown).length > 0 && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-[#F59E0B]" />
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Subscription Breakdown
                </p>
              </div>
              <div className="flex items-end gap-1 h-16">
                {Object.entries(data.tierBreakdown)
                  .sort(([a], [b]) => {
                    const order = ["trial", "standard", "business", "enterprise"];
                    return order.indexOf(a) - order.indexOf(b);
                  })
                  .map(([tier, count]) => {
                    const total = Object.values(data.tierBreakdown).reduce(
                      (s, c) => s + c,
                      0,
                    );
                    const pct = total > 0 ? Math.max((count / total) * 100, 5) : 10;
                    return (
                      <div key={tier} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-600">{count}</span>
                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{
                            height: `${pct}%`,
                            backgroundColor: TIER_COLORS[tier] ?? "#9CA3AF",
                            minHeight: "4px",
                          }}
                        />
                        <span className="text-[9px] font-semibold text-gray-400 capitalize">
                          {tier}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
