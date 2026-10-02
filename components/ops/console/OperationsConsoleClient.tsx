"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  ClipboardList,
  FolderOpen,
  Inbox,
  Link2,
  MessageSquare,
  Activity,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useOpsConsoleStore } from "@/lib/stores/useOpsConsoleStore";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";
import { cn } from "@/lib/utils";
import type { OpsConsoleInitialData, OpsConsoleTab } from "@/lib/ops-console/types";
import { OverviewTab } from "./tabs/OverviewTab";
import { FeedbackTab } from "./tabs/FeedbackTab";
import { HealthTab } from "./tabs/HealthTab";
import {
  CommercialTab,
  ContactsTab,
  DeliverablesTab,
  JobsTab,
  LeadsTab,
  PortalsTab,
} from "./tabs/OwnerWorkTabs";

type TabDef = { id: OpsConsoleTab; label: string; icon: LucideIcon; ceoOnly: boolean };

const TABS: TabDef[] = [
  { id: "overview", label: "Home", icon: BarChart3, ceoOnly: true },
  { id: "leads", label: "Leads", icon: Inbox, ceoOnly: true },
  { id: "portals", label: "Portals", icon: Link2, ceoOnly: true },
  { id: "jobs", label: "Jobs", icon: FolderOpen, ceoOnly: true },
  { id: "deliverables", label: "Deliverables", icon: ClipboardList, ceoOnly: true },
  { id: "commercial", label: "Quotes", icon: Receipt, ceoOnly: true },
  { id: "contacts", label: "Contacts", icon: Users, ceoOnly: true },
  { id: "feedback", label: "Feedback", icon: MessageSquare, ceoOnly: false },
  { id: "health", label: "Health", icon: Activity, ceoOnly: true },
];

function TabContent({ tab, work }: { tab: OpsConsoleTab; work: OpsConsoleInitialData["work"] }) {
  switch (tab) {
    case "overview":
      return <OverviewTab />;
    case "leads":
      return <LeadsTab work={work} />;
    case "portals":
      return <PortalsTab work={work} />;
    case "jobs":
      return <JobsTab work={work} />;
    case "deliverables":
      return <DeliverablesTab work={work} />;
    case "commercial":
      return <CommercialTab work={work} />;
    case "contacts":
      return <ContactsTab work={work} />;
    case "feedback":
      return <FeedbackTab />;
    case "health":
      return <HealthTab />;
    default:
      return <OverviewTab />;
  }
}

export function OperationsConsoleClient({ initial }: { initial: OpsConsoleInitialData }) {
  const router = useRouter();
  const { activeTab, setActiveTab, hydrate, error } = useOpsConsoleStore();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
        <h1 className={t.title}>CEO Dashboard</h1>
        <div className={t.headerActions}>
          {initial.isCeo ? (
            <Link href="/digital-twin" className={t.secondaryButton}>
              Twin 360
            </Link>
          ) : null}
          <button type="button" onClick={() => void signOut()} className={t.quietAction}>
            Sign out
          </button>
        </div>
      </header>

      <nav className={t.tabBar} aria-label="CEO Dashboard sections">
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
        <TabContent tab={effectiveTab} work={initial.work} />
      </div>
    </div>
  );
}
