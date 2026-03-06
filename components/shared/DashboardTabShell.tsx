"use client";

import { useState } from "react";
import { type LucideIcon } from "lucide-react";
import DashboardHeader from "@/components/shared/DashboardHeader";
import WidgetCustomizeDrawer from "@/components/widgets/WidgetCustomizeDrawer";
import { type Tier } from "@/lib/entitlements";

export type TabStatus = "coming-soon" | "under-development" | "live";

export interface DashboardTabShellProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  title: string;
  icon?: LucideIcon;
  accent?: string;
  status?: TabStatus;
  isCeo?: boolean;
  internalAccess?: { ceo?: boolean; market?: boolean; athlete360?: boolean };
  children?: React.ReactNode;
}

export default function DashboardTabShell({
  user,
  tier,
  title,
  icon: Icon,
  accent = "#1E3A8A",
  status = "coming-soon",
  isCeo = false,
  internalAccess,
  children,
}: DashboardTabShellProps) {
  const [customizeOpen, setCustomizeOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#ECEEF2] overflow-x-hidden">

      {/* Shared header — identical to dashboard home */}
      <DashboardHeader
        user={user}
        tier={tier}
        isCeo={isCeo}
        internalAccess={internalAccess}
        showBackLink
        searchPlaceholder={`Search ${title}\u2026`}
        onCustomizeOpen={() => setCustomizeOpen(true)}
      />

      {/* MAIN */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden space-y-6">

        {/* Page-header row */}
        <div className="flex items-center gap-4">
          {Icon && (
            <div
              className="h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: `${accent}15`, color: accent }}
            >
              <Icon size={24} />
            </div>
          )}
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-xl font-black text-gray-900 sm:text-2xl">{title}</h1>
            {status === "under-development" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                Under Development
              </span>
            )}
            {status === "coming-soon" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                Coming Soon
              </span>
            )}
          </div>
        </div>

        {children}
      </main>

      {/* CUSTOMIZE DRAWER */}
      <WidgetCustomizeDrawer
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title={`Customize ${title}`}
        subtitle="Widget customization will be available when this module launches"
        widgetPrefs={[]}
        widgetMeta={[]}
        onToggleVisible={() => {}}
        onSetSize={() => {}}
        onMoveOrder={() => {}}
        onReset={() => {}}
      />
    </div>
  );
}
