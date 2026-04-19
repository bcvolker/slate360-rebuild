"use client";

import { Bell, Mail, Smartphone, MonitorSmartphone } from "lucide-react";
import { useState } from "react";

const NOTIFICATION_SETTINGS = [
  { id: "email_project", label: "Project updates", desc: "Status changes, new uploads, deadlines", icon: Mail, default: true },
  { id: "email_billing", label: "Billing alerts", desc: "Invoices, payment failures, renewals", icon: Mail, default: true },
  { id: "email_security", label: "Security alerts", desc: "New logins, password changes", icon: Mail, default: true },
  { id: "email_product", label: "Product updates", desc: "New features, release notes", icon: Mail, default: false },
  { id: "push_activity", label: "Push notifications", desc: "Real-time activity from your projects", icon: Smartphone, default: true },
  { id: "push_mentions", label: "Mentions & comments", desc: "When someone tags you or replies", icon: MonitorSmartphone, default: true },
] as const;

export default function AccountNotificationsTab() {
  const [settings, setSettings] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_SETTINGS.map((s) => [s.id, s.default]))
  );

  function toggle(id: string) {
    setSettings((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-app bg-app-card p-6">
        <h3 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Bell size={16} className="text-[#F59E0B]" /> Notification Preferences
        </h3>
        <div className="space-y-1">
          {NOTIFICATION_SETTINGS.map((setting) => {
            const Icon = setting.icon;
            return (
              <label
                key={setting.id}
                className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} className="text-zinc-500" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">{setting.label}</p>
                    <p className="text-[10px] text-zinc-500">{setting.desc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings[setting.id]}
                  onClick={() => toggle(setting.id)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings[setting.id] ? "bg-[#F59E0B]" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      settings[setting.id] ? "translate-x-4.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-zinc-600 text-center">
        Changes are saved automatically. You can also manage email preferences from the footer of any notification email.
      </p>
    </div>
  );
}
