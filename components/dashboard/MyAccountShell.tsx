"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { User, CreditCard, Bell, Shield, ArrowRight } from "lucide-react";
import type { Tier } from "@/lib/entitlements";

const SECTIONS = [
  { icon: User,       label: "Profile",              desc: "Update your name, avatar, company info, and display preferences." },
  { icon: CreditCard, label: "Subscription & Billing", desc: "Manage your plan, view invoices, and purchase credit packs." },
  { icon: Bell,       label: "Notifications",          desc: "Configure email, push, and in-app notification preferences." },
  { icon: Shield,     label: "Security",               desc: "Change password, manage sessions, and configure two-factor auth." },
];

interface Props {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
}

export default function MyAccountShell({ user, tier }: Props) {
  return (
    <DashboardTabShell
      user={user}
      tier={tier}
      title="My Account"
      icon={User}
      accent="#1E3A8A"
      status="coming-soon"
    >
      {/* Identity card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 flex items-center gap-4">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-[#1E3A8A] flex items-center justify-center text-white text-xl font-bold">
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
              <div className="h-9 w-9 shrink-0 rounded-xl bg-[#1E3A8A]/8 flex items-center justify-center">
                <Icon size={16} className="text-[#1E3A8A]" />
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
          className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#162D69] transition-colors"
        >
          Open Portal <ArrowRight size={14} />
        </button>
      </div>
    </DashboardTabShell>
  );
}
