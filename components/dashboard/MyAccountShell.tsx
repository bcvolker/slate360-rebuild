"use client";

import { useState } from "react";
import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { User, CreditCard, Bell, Shield, ArrowRight, Plug, Link2, CheckCircle2 } from "lucide-react";
import type { Tier } from "@/lib/entitlements";

const SECTIONS = [
  { icon: User,       label: "Profile",              desc: "Update your name, avatar, company info, and display preferences." },
  { icon: CreditCard, label: "Subscription & Billing", desc: "Manage your plan, view invoices, and purchase credit packs." },
  { icon: Bell,       label: "Notifications",          desc: "Configure email, push, and in-app notification preferences." },
  { icon: Shield,     label: "Security",               desc: "Change password, manage sessions, and configure two-factor auth." },
];

const INTEGRATIONS = [
  { id: "microsoft-project", name: "Microsoft Project", description: "Sync project schedules and milestone updates between Slate360 and Microsoft Project." },
  { id: "foundation-software", name: "Foundation Software", description: "Connect job-cost data and accounting records with bidirectional sync placeholders." },
  { id: "procore", name: "Procore", description: "Exchange RFIs, submittals, and progress details across both systems." },
  { id: "autodesk", name: "Autodesk", description: "Bridge design and model context between Autodesk workflows and Slate360." },
];

interface Props {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
  internalAccess?: { ceo?: boolean; market?: boolean; athlete360?: boolean };
}

export default function MyAccountShell({ user, tier, isCeo, internalAccess }: Props) {
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  return (
    <DashboardTabShell
      user={user}
      tier={tier}
      isCeo={isCeo}
      internalAccess={internalAccess}
      title="My Account"
      icon={User}
      accent="#D4AF37"
      status="coming-soon"
    >
      {/* Identity card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 flex items-center gap-4">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-zinc-700 flex items-center justify-center text-white text-xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-base font-black text-gray-900">{user.name}</p>
          <p className="text-sm text-gray-400">{user.email}</p>
        </div>
      </div>

      {/* Settings sections */}
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-zinc-800 flex items-center justify-center">
                <Icon size={16} className="text-zinc-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{s.label}</p>
                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stripe billing portal */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">Billing Portal</p>
          <p className="mt-0.5 text-xs text-gray-500">Manage subscription, payment methods, and download invoices.</p>
        </div>
        <button
          onClick={async () => {
            try {
              const res = await fetch("/api/billing/portal", { method: "POST" });
              const data = (await res.json()) as { url?: string };
              if (data.url) window.location.href = data.url;
            } catch { /* handled */ }
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E04400] transition-colors"
        >
          Open Portal <ArrowRight size={14} />
        </button>
      </div>

      {/* Integrations */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Plug size={16} className="text-zinc-400" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Integrations</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {INTEGRATIONS.map((integration) => {
            const isConnected = Boolean(connected[integration.id]);
            return (
              <article key={integration.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-2 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600">
                  <Link2 size={16} />
                </div>
                <p className="text-sm font-bold text-gray-900">{integration.name}</p>
                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{integration.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => setConnected((prev) => ({ ...prev, [integration.id]: !prev[integration.id] }))}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#E64500]"
                  >
                    <CheckCircle2 size={14} />
                    {isConnected ? "Connected" : "Connect"}
                  </button>
                  <span className={`text-xs font-semibold ${isConnected ? "text-emerald-700" : "text-gray-400"}`}>
                    {isConnected ? "Ready" : "Not connected"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </DashboardTabShell>
  );
}
