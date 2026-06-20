"use client";

import { useEffect } from "react";
import {
  Shield,
  BarChart3,
  DollarSign,
  Users,
  Settings,
  MessageSquare,
  MessagesSquare,
  FileText,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { useOpsConsoleStore } from "@/lib/stores/useOpsConsoleStore";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";
import { cn } from "@/lib/utils";
import type { OpsConsoleInitialData, OpsConsoleTab } from "@/lib/ops-console/types";
import { OverviewTab } from "./tabs/OverviewTab";
import { RevenueTab } from "./tabs/RevenueTab";
import { UsersTab } from "./tabs/UsersTab";
import { PlansTab } from "./tabs/PlansTab";
import { FeedbackTab } from "./tabs/FeedbackTab";
import { CommunicationsTab } from "./tabs/CommunicationsTab";
import { StaffTab } from "./tabs/StaffTab";
import { ContentTab } from "./tabs/ContentTab";
import { HealthTab } from "./tabs/HealthTab";

type TabDef = { id: OpsConsoleTab; label: string; icon: LucideIcon; ceoOnly: boolean };

const TABS: TabDef[] = [
  { id: "overview", label: "Overview", icon: BarChart3, ceoOnly: true },
  { id: "revenue", label: "Revenue & Finance", icon: DollarSign, ceoOnly: true },
  { id: "users", label: "Users & Orgs", icon: Users, ceoOnly: true },
  { id: "plans", label: "Plans & Pricing", icon: Settings, ceoOnly: true },
  { id: "feedback", label: "Feedback & Approvals", icon: MessageSquare, ceoOnly: false },
  { id: "communications", label: "Communications", icon: MessagesSquare, ceoOnly: true },
  { id: "staff", label: "Staff & Access", icon: Shield, ceoOnly: true },
  { id: "content", label: "Content & Marketing", icon: FileText, ceoOnly: true },
  { id: "health", label: "System Health", icon: Activity, ceoOnly: true },
];

function TabContent({ tab }: { tab: OpsConsoleTab }) {
  switch (tab) {
    case "overview":
      return <OverviewTab />;
    case "revenue":
      return <RevenueTab />;
    case "users":
      return <UsersTab />;
    case "plans":
      return <PlansTab />;
    case "feedback":
      return <FeedbackTab />;
    case "communications":
      return <CommunicationsTab />;
    case "staff":
      return <StaffTab />;
    case "content":
      return <ContentTab />;
    case "health":
      return <HealthTab />;
    default:
      return null;
  }
}

export function OperationsConsoleClient({ initial }: { initial: OpsConsoleInitialData }) {
  const { activeTab, setActiveTab, hydrate, error } = useOpsConsoleStore();

  useEffect(() => {
    hydrate(initial);
  }, [hydrate, initial]);

  const visibleTabs = TABS.filter((tab) => initial.isCeo || !tab.ceoOnly);
  const effectiveTab = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : visibleTabs[0]?.id ?? "feedback";

  return (
    <div className={t.page} data-mobile-route="platform">
      <header className={t.header}>
        <div>
          <p className={t.eyebrow}>Operations Console</p>
          <h1 className={t.title}>Internal tools</h1>
          <p className={t.subtitle}>
            {initial.isCeo ? "Owner command center" : "Staff workspace"} — staff only
          </p>
        </div>
      </header>

      <nav className={t.tabBar} aria-label="Operations Console sections">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = effectiveTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(t.tab, isActive && t.tabActive)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <p className="mb-4 rounded-xl border border-[color-mix(in_srgb,#ef4444_30%,transparent)] bg-[color-mix(in_srgb,#ef4444_10%,transparent)] px-4 py-3 text-sm text-[#fca5a5]">
            {error}
          </p>
        ) : null}
        <TabContent tab={effectiveTab} />
      </div>
    </div>
  );
}
