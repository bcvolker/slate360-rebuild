"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Shield,
  Users,
  Building2,
  Tag,
  CreditCard,
  DollarSign,
  Activity,
  FolderOpen,
  Mail,
  LifeBuoy,
  ClipboardList,
  Briefcase,
  Settings,
  FileText,
} from "lucide-react";
import { OverviewTab } from "./OverviewTab";
import { BetaApprovalsTab } from "./BetaApprovalsTab";
import { UserAccountsTab } from "./UserAccountsTab";
import { OrganizationsTab } from "./OrganizationsTab";

type TabID =
  | "overview"
  | "beta"
  | "users"
  | "orgs"
  | "plans"
  | "subs"
  | "revenue"
  | "usage"
  | "content"
  | "comms"
  | "support"
  | "surveys"
  | "employees"
  | "product_ops"
  | "audit";

interface TabDef {
  id: TabID;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "beta", label: "Beta Approvals", icon: Shield },
  { id: "users", label: "User Accounts", icon: Users },
  { id: "orgs", label: "Organizations", icon: Building2 },
  { id: "plans", label: "Plans & Pricing", icon: Tag },
  { id: "subs", label: "Subscriptions", icon: CreditCard },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "usage", label: "Usage", icon: Activity },
  { id: "content", label: "Content Assets", icon: FolderOpen },
  { id: "comms", label: "Communications", icon: Mail },
  { id: "support", label: "Support", icon: LifeBuoy },
  { id: "surveys", label: "Surveys", icon: ClipboardList },
  { id: "employees", label: "Employees", icon: Briefcase },
  { id: "product_ops", label: "Product Ops", icon: Settings },
  { id: "audit", label: "Audit Log", icon: FileText },
];

const PHASE_2_TABS: ReadonlyArray<TabID> = [
  "plans",
  "subs",
  "revenue",
  "usage",
  "content",
  "comms",
  "support",
  "surveys",
  "employees",
  "product_ops",
  "audit",
];

type Props = {
  ownerEmail: string;
};

export function OperationsConsoleClient({ ownerEmail }: Props) {
  const [activeTab, setActiveTab] = useState<TabID>("overview");
  const activeDef = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cobalt/10 p-2">
            <Shield className="h-5 w-5 text-cobalt" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Operations Console</h1>
            <p className="text-xs text-muted-foreground">Slate360 platform admin · {ownerEmail}</p>
          </div>
        </div>

        <div className="border-b border-border">
          <div className="overflow-x-auto -mb-px">
            <div className="flex gap-1 min-w-max">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      active
                        ? "border-cobalt text-cobalt"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "beta" && <BetaApprovalsTab />}
          {activeTab === "users" && <UserAccountsTab />}
          {activeTab === "orgs" && <OrganizationsTab />}
          {PHASE_2_TABS.includes(activeTab) && <Phase2Placeholder label={activeDef.label} />}
        </div>
      </div>
    </div>
  );
}

export default OperationsConsoleClient;

function Phase2Placeholder({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <h3 className="text-base font-semibold text-foreground mb-1">{label}</h3>
      <p className="text-sm text-muted-foreground">
        Module under construction — coming in Operations Console Phase 2.
      </p>
    </div>
  );
}
