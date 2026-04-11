"use client";

import { useMemo, useState } from "react";
import {
  Gauge,
  Percent,
  WalletCards,
  TrendingUp,
  Users2,
  SlidersHorizontal,
  CreditCard,
  Shield,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import DashboardTabShell from "@/components/shared/DashboardTabShell";
import CeoStaffPanel from "@/components/dashboard/ceo/CeoStaffPanel";
import CeoPlatformOverview from "@/components/dashboard/ceo/CeoPlatformOverview";
import { useCeoStaff } from "@/lib/hooks/useCeoStaff";
import { useCeoSubscriberDirectory } from "@/lib/hooks/useCeoSubscriberDirectory";
import type { Tier } from "@/lib/entitlements";

type CeoTab = "overview" | "staff" | "controls";

const CEO_TABS: { id: CeoTab; label: string; icon: typeof Shield }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "staff", label: "Staff & Access", icon: ShieldCheck },
  { id: "controls", label: "Controls", icon: SlidersHorizontal },
];

const PLANS = [
  { name: "Standard", price: "TBD", seats: "Multi-seat" },
  { name: "Business", price: "TBD", seats: "Team" },
  { name: "Enterprise", price: "Custom", seats: "Unlimited" },
];

const MOCK_METRICS = [
  { label: "MRR", value: "$128,400", icon: TrendingUp, accent: "#FF6B35" },
  { label: "Churn", value: "2.8%", icon: Percent, accent: "#3B82F6" },
  { label: "Margin", value: "67%", icon: Gauge, accent: "#6366F1" },
  { label: "Runway", value: "22 months", icon: WalletCards, accent: "#F97316" },
  { label: "Active Subs", value: "1,942", icon: Users2, accent: "#60A5FA" },
];

interface CeoProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
  internalAccess?: { ceo?: boolean; market?: boolean; athlete360?: boolean };
}

export default function CeoCommandCenterClient({ user, tier, isCeo = false, internalAccess }: CeoProps) {
  const [activeTab, setActiveTab] = useState<CeoTab>("overview");
  const [priceLift, setPriceLift] = useState(10);
  const baseMrr = 128400;
  const projectedMrr = useMemo(() => Math.round(baseMrr + priceLift * 190), [priceLift]);
  const staffHook = useCeoStaff();
  const directoryHook = useCeoSubscriberDirectory();

  return (
    <DashboardTabShell
      user={user}
      tier={tier}
      title="CEO Command Center"
      icon={Shield}
      accent="#D4AF37"
      status="live"
      isCeo={isCeo}
      internalAccess={internalAccess}
    >
      {/* Hero card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">CEO Command Center</p>
        <h2 className="text-2xl font-black text-gray-900">Executive Operations Console</h2>
        <p className="mt-1 text-sm text-gray-500">Platform health, staff access management, pricing controls, and internal operations.</p>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {CEO_TABS.map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === id
                ? "bg-[#D4AF37] text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <TabIcon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <>
          <CeoPlatformOverview />

          {/* Business Health (mock until Stripe integration) */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Business Health</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {MOCK_METRICS.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="mb-2 inline-flex rounded-lg p-2" style={{ backgroundColor: `${item.accent}15` }}>
                      <Icon size={14} color={item.accent} />
                    </div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">{item.label}</p>
                    <p className="mt-1 text-xl font-black text-gray-900">{item.value}</p>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Staff & Access tab */}
      {activeTab === "staff" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <CeoStaffPanel
            staff={staffHook.staff}
            loading={staffHook.loading}
            error={staffHook.error}
            subscribers={directoryHook.subscribers}
            directoryLoading={directoryHook.loading}
            directoryError={directoryHook.error}
            onGrant={async (payload) => {
              const result = await staffHook.grantAccess(payload);
              await Promise.all([staffHook.reload(), directoryHook.reload()]);
              return result;
            }}
            onRevoke={async (staffId) => {
              const result = await staffHook.revokeAccess(staffId);
              await Promise.all([staffHook.reload(), directoryHook.reload()]);
              return result;
            }}
            onUpdate={async (staffId, payload) => {
              const result = await staffHook.updateStaff(staffId, payload);
              await Promise.all([staffHook.reload(), directoryHook.reload()]);
              return result;
            }}
            onReload={async () => {
              await Promise.all([staffHook.reload(), directoryHook.reload()]);
            }}
          />
        </div>
      )}

      {/* Controls tab */}
      {activeTab === "controls" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
              <SlidersHorizontal size={15} className="text-[#FF6B35]" /> Actions &amp; Experiments
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              What-if model: If we increase price by ${priceLift}, projected MRR becomes:
            </p>
            <p className="mt-2 text-3xl font-black text-[#FF6B35]">${projectedMrr.toLocaleString()}</p>
            <div className="mt-4">
              <input
                type="range"
                min={0}
                max={100}
                value={priceLift}
                onChange={(e) => setPriceLift(Number(e.target.value))}
                className="w-full accent-[#FF6B35]"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                <span>$0 increase</span>
                <span>${priceLift} selected</span>
                <span>$100 increase</span>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
              <CreditCard size={15} className="text-[#3B82F6]" /> Subscription Plans
            </h2>
            <div className="mt-3 space-y-2">
              {PLANS.map((plan) => (
                <div key={plan.name} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                    <p className="text-xs text-gray-400">{plan.price} · {plan.seats}</p>
                  </div>
                  <button className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                    Edit Pricing
                  </button>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}
    </DashboardTabShell>
  );
}
