"use client";

import DashboardTabShell from "@/components/shared/DashboardTabShell";
import { User, CreditCard, Bell, Shield, ArrowRight } from "lucide-react";

const SECTIONS = [
  { icon: User, label: "Profile", desc: "Update your name, avatar, company info, and display preferences.", href: "#profile" },
  { icon: CreditCard, label: "Subscription & Billing", desc: "Manage your plan, view invoices, and purchase credit packs.", href: "#billing" },
  { icon: Bell, label: "Notifications", desc: "Configure email, push, and in-app notification preferences.", href: "#notifications" },
  { icon: Shield, label: "Security", desc: "Change password, manage sessions, and configure two-factor auth.", href: "#security" },
];

export default function MyAccountShell({ userEmail }: { userEmail: string }) {
  return (
    <DashboardTabShell
      category="Settings"
      title="My Account"
      description="Manage your profile, subscription, billing, and account settings."
      icon={User}
      accent="#1E3A8A"
    >
      {/* Account overview card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[#1E3A8A]/10 flex items-center justify-center">
            <User size={24} className="text-[#1E3A8A]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900">{userEmail}</h2>
            <p className="text-sm text-gray-500">Account settings and preferences</p>
          </div>
        </div>
      </div>

      {/* Settings sections */}
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 flex items-start gap-4 hover:border-gray-300 transition-colors cursor-pointer"
            >
              <div className="h-10 w-10 shrink-0 rounded-xl bg-[#1E3A8A]/8 flex items-center justify-center">
                <Icon size={18} className="text-[#1E3A8A]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900">{s.label}</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
              <ArrowRight size={14} className="mt-1 text-gray-400" />
            </div>
          );
        })}
      </div>

      {/* Billing portal link */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Stripe Billing Portal</h3>
          <p className="mt-1 text-xs text-gray-500">Manage subscription, payment methods, and download invoices.</p>
        </div>
        <button
          onClick={async () => {
            try {
              const res = await fetch("/api/billing/portal", { method: "POST" });
              const data = await res.json();
              if (data.url) window.location.href = data.url;
            } catch {
              /* handled */
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#162D69] transition-colors"
        >
          Open Portal <ArrowRight size={14} />
        </button>
      </div>
    </DashboardTabShell>
  );
}
