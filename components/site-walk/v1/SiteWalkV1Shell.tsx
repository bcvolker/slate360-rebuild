"use client";

import type { ReactNode } from "react";
import {
  Home,
  MapPin,
  FolderOpen,
  MessageSquare,
  Package,
} from "lucide-react";
import { SlateLogo } from "@/components/shared/SlateLogo";
import { SiteWalkV1Header } from "./SiteWalkV1Header";
import type { V1NavTab } from "./SiteWalkV1BottomNav";
import {
  MobileAppShell,
  MobileBottomNav,
  type MobileBottomNavItem,
  MobileComingSoonSheet,
} from "@/components/mobile-system";
import { useState } from "react";
import { cn } from "@/lib/utils";

type SiteWalkV1ShellProps = {
  title: string;
  activeTab: V1NavTab;
  onTabChange: (tab: V1NavTab) => void;
  onBack?: () => void;
  primaryAction?: { label: string; onClick: () => void };
  overflowActions?: { label: string; onClick: () => void; destructive?: boolean }[];
  showBottomNav?: boolean;
  useProjectLabel?: boolean;
  children: ReactNode;
  className?: string;
};

const sidebarItems: { id: V1NavTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "worksites", label: "Worksites", icon: MapPin },
  { id: "slatedrop", label: "SlateDrop", icon: FolderOpen },
  { id: "coordination", label: "Coordination", icon: MessageSquare },
  { id: "deliverables", label: "Deliverables", icon: Package },
];

export function SiteWalkV1Shell({
  title,
  activeTab,
  onTabChange,
  onBack,
  primaryAction,
  overflowActions,
  showBottomNav = true,
  useProjectLabel = false,
  children,
  className,
}: SiteWalkV1ShellProps) {
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);

  const navItems: MobileBottomNavItem<V1NavTab>[] = [
    { key: "home", label: "Home", icon: Home, onSelect: () => onTabChange("home") },
    {
      key: "worksites",
      label: useProjectLabel ? "Projects" : "Worksites",
      icon: MapPin,
      onSelect: () => onTabChange("worksites"),
    },
    { key: "slatedrop", label: "SlateDrop", icon: FolderOpen, onSelect: () => setComingSoonTitle("SlateDrop") },
    { key: "coordination", label: "Coordination", icon: MessageSquare, onSelect: () => setComingSoonTitle("Coordination") },
    { key: "deliverables", label: "Deliverables", icon: Package, onSelect: () => setComingSoonTitle("Deliverables") },
  ];

  return (
    <>
      <MobileAppShell
      className="fixed inset-0 z-50"
      sidebar={
        <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-zinc-900/60 lg:flex">
          <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
            <SlateLogo size="sm" />
            <span className="text-[10px] font-medium text-zinc-500">Site Walk</span>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 p-2">
            {sidebarItems.map(({ id, label, icon: Icon }) => {
              const displayLabel =
                id === "worksites" && useProjectLabel ? "Projects" : label;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    activeTab === id
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                  )}
                >
                  <Icon className="size-4" />
                  {displayLabel}
                </button>
              );
            })}
          </nav>
        </aside>
      }
      header={
        <SiteWalkV1Header
          title={title}
          onBack={onBack}
          primaryAction={primaryAction}
          overflowActions={overflowActions}
          showAvatar
          showToolIcons={activeTab === "home"}
          showBranding={activeTab === "home"}
        />
      }
      mainClassName={className}
      bottomNav={
        showBottomNav ? (
          <MobileBottomNav
            items={navItems}
            activeKey={activeTab}
          />
        ) : undefined
      }
    >
      {children}
      </MobileAppShell>
      {comingSoonTitle && (
        <MobileComingSoonSheet
          open={!!comingSoonTitle}
          onOpenChange={(open) => !open && setComingSoonTitle(null)}
          title={`${comingSoonTitle} on Mobile`}
        />
      )}
    </>
  );
}
