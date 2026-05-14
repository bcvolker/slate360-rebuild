"use client";

import { Home, MapPin, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type V1NavTab = "home" | "worksites" | "reports" | "account";

type SiteWalkV1BottomNavProps = {
  activeTab: V1NavTab;
  onTabChange: (tab: V1NavTab) => void;
};

const tabs: { id: V1NavTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "worksites", label: "Worksites", icon: MapPin },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "account", label: "Account", icon: User },
];

export function SiteWalkV1BottomNav({
  activeTab,
  onTabChange,
}: SiteWalkV1BottomNavProps) {
  return (
    <nav className="flex h-14 items-stretch border-t border-white/10 bg-zinc-900/90 backdrop-blur-sm">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
              active
                ? "text-amber-500"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
