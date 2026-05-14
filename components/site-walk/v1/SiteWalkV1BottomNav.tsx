"use client";

import {
  Home,
  MapPin,
  FolderOpen,
  MessageSquare,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type V1NavTab =
  | "home"
  | "worksites"
  | "slatedrop"
  | "coordination"
  | "deliverables";

type TabDef = {
  id: V1NavTab;
  label: string;
  icon: typeof Home;
};

type SiteWalkV1BottomNavProps = {
  activeTab: V1NavTab;
  onTabChange: (tab: V1NavTab) => void;
  /** If true the Worksites tab shows "Projects" instead. */
  useProjectLabel?: boolean;
};

function getTabs(useProjectLabel: boolean): TabDef[] {
  return [
    { id: "home", label: "Home", icon: Home },
    {
      id: "worksites",
      label: useProjectLabel ? "Projects" : "Worksites",
      icon: MapPin,
    },
    { id: "slatedrop", label: "SlateDrop", icon: FolderOpen },
    { id: "coordination", label: "Coordination", icon: MessageSquare },
    { id: "deliverables", label: "Deliverables", icon: Package },
  ];
}

export function SiteWalkV1BottomNav({
  activeTab,
  onTabChange,
  useProjectLabel = false,
}: SiteWalkV1BottomNavProps) {
  const tabs = getTabs(useProjectLabel);

  return (
    <nav className="flex h-14 items-stretch border-t border-white/10 bg-zinc-900/90 backdrop-blur-sm lg:hidden">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              active
                ? "text-amber-500"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Icon className="size-5" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
