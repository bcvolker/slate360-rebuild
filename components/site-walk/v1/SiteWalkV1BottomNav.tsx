"use client";

import {
  Home,
  MapPin,
  FolderOpen,
  MessageSquare,
  Package,
} from "lucide-react";
import { MobileBottomNav, type MobileBottomNavItem } from "@/components/mobile-system";

export type V1NavTab =
  | "home"
  | "worksites"
  | "slatedrop"
  | "coordination"
  | "deliverables";

type SiteWalkV1BottomNavProps = {
  activeTab: V1NavTab;
  onTabChange: (tab: V1NavTab) => void;
  /** If true the Worksites tab shows "Projects" instead. */
  useProjectLabel?: boolean;
};

function getTabs(
  useProjectLabel: boolean,
  onTabChange: (tab: V1NavTab) => void,
): MobileBottomNavItem<V1NavTab>[] {
  return [
    { key: "home", label: "Home", icon: Home, onSelect: () => onTabChange("home") },
    {
      key: "worksites",
      label: useProjectLabel ? "Projects" : "Worksites",
      icon: MapPin,
      onSelect: () => onTabChange("worksites"),
    },
    { key: "slatedrop", label: "SlateDrop", icon: FolderOpen, onSelect: () => onTabChange("slatedrop") },
    { key: "coordination", label: "Coordination", icon: MessageSquare, onSelect: () => onTabChange("coordination") },
    { key: "deliverables", label: "Deliverables", icon: Package, onSelect: () => onTabChange("deliverables") },
  ];
}

export function SiteWalkV1BottomNav({
  activeTab,
  onTabChange,
  useProjectLabel = false,
}: SiteWalkV1BottomNavProps) {
  return (
    <MobileBottomNav
      items={getTabs(useProjectLabel, onTabChange)}
      activeKey={activeTab}
    />
  );
}
