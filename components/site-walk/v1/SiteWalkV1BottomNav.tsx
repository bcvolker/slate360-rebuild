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
    <nav
      className="shrink-0 lg:hidden rounded-t-3xl border-t border-white/10 bg-[#0B0F15]/88 shadow-lg backdrop-blur-md flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingTop: "4px" }}
    >
      <ul className="flex min-h-[70px] flex-1 items-stretch justify-around px-2 w-full">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <li key={id} className="flex-1">
          <button
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              "relative flex flex-col items-center justify-center h-full w-full gap-1 py-2 transition-colors duration-200 rounded-lg mx-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
              active
                ? "bg-amber-500/10 text-amber-500"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full bg-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.45)]"
              />
            )}
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 2}
              className={cn("transition-transform", active && "-translate-y-0.5")}
            />
            <span className={cn("text-[10px] font-medium leading-none truncate", active && "font-semibold")}>
              {label}
            </span>
          </button>
          </li>
        );
      })}
      </ul>
    </nav>
  );
}
