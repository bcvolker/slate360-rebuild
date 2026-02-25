"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  LayoutDashboard,
  FolderKanban,
  Palette,
  Layers,
  Compass,
  Globe,
  Film,
  BarChart3,
  FolderOpen,
  Plug,
  User,
} from "lucide-react";

const QUICK_NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Project Hub", href: "/project-hub", icon: FolderKanban },
  { label: "Design Studio", href: "/design-studio", icon: Palette },
  { label: "Content Studio", href: "/content-studio", icon: Layers },
  { label: "360 Tours", href: "/tours", icon: Compass },
  { label: "Geospatial", href: "/geospatial", icon: Globe },
  { label: "Virtual Studio", href: "/virtual-studio", icon: Film },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "SlateDrop", href: "/slatedrop", icon: FolderOpen },
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "My Account", href: "/my-account", icon: User },
];

export default function QuickNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
      >
        <LayoutDashboard size={14} /> Navigate <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl py-2 overflow-hidden">
            {QUICK_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-[#FF4D00]/5 hover:text-[#FF4D00] transition-colors"
                >
                  <Icon size={14} /> {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
