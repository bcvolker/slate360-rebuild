"use client";

import { Bell, Building2, CreditCard, Database, Lock, Shield, User, Users } from "lucide-react";

type AccountSection = {
  title: string;
  detail: string;
  tabId: string;
  icon: typeof User;
  audience?: "admin" | "everyone";
  status?: string;
};

const sections: AccountSection[] = [
  { title: "Profile", detail: "Name, email, organization, and personal identity.", tabId: "profile", icon: User, status: "Ready" },
  { title: "Security", detail: "Password reset, sessions, login history, and future 2FA.", tabId: "security", icon: Lock, status: "Ready" },
  { title: "Notifications", detail: "Email, push, project, product, and coordination preferences.", tabId: "notifications", icon: Bell, status: "Ready" },
  { title: "Organization", detail: "Workspace profile, members, roles, permissions, and audit log.", tabId: "workspace", icon: Building2, audience: "admin", status: "Admin" },
  { title: "Billing & Apps", detail: "Plan, invoices, credits, app access, bundles, and storage upgrades.", tabId: "billing", icon: CreditCard, audience: "admin", status: "Admin" },
  { title: "Data & Storage", detail: "Storage usage, file counts, credits, exports, and retention controls.", tabId: "data", icon: Database, audience: "admin", status: "Admin" },
  { title: "Team Seats", detail: "Enterprise seats, app assignment, and member-level permissions.", tabId: "members", icon: Users, audience: "admin", status: "Next" },
  { title: "Privacy", detail: "Data export, deletion requests, policies, and legal settings.", tabId: "privacy", icon: Shield, status: "Next" },
];

export default function AccountControlCenterNav({ isAdmin, activeTab, onSelect }: {
  isAdmin: boolean;
  activeTab: string;
  onSelect: (tabId: string) => void;
}) {
  const visible = sections.filter((section) => section.audience !== "admin" || isAdmin);

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {visible.map((section) => {
        const Icon = section.icon;
        const selected = activeTab === section.tabId;
        return (
          <button
            key={section.title}
            type="button"
            onClick={() => onSelect(section.tabId)}
            className={`rounded-2xl border p-4 text-left transition hover:border-blue-500 hover:shadow-sm ${selected ? "border-blue-400 bg-blue-50" : "border-app bg-app-card"}`}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={selected ? "text-sm font-black text-slate-950" : "text-sm font-black text-zinc-100"}>{section.title}</p>
                  {section.status ? (
                    <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-600 ring-1 ring-blue-200">
                      {section.status}
                    </span>
                  ) : null}
                </div>
                <p className={selected ? "mt-1 text-xs leading-5 text-slate-600" : "mt-1 text-xs leading-5 text-zinc-400"}>{section.detail}</p>
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
}
