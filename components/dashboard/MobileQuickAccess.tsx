"use client";

import Link from "next/link";
import {
  ChevronDown,
  FolderKanban,
  BarChart3,
  Layers,
  LayoutDashboard,
  Home,
} from "lucide-react";

interface MobileQuickAccessProps {
  open: boolean;
  onToggle: () => void;
}

export default function MobileQuickAccess({ open, onToggle }: MobileQuickAccessProps) {
  return (
    <div className="block md:hidden mb-6">
      <div className="relative">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E04400] text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <LayoutDashboard size={16} />
            </div>
            <div className="text-left">
              <p className="text-sm font-black tracking-wide">Quick Access</p>
              <p className="text-[11px] text-blue-200/80">Navigate modules &amp; tools</p>
            </div>
          </div>
          <ChevronDown size={16} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={onToggle} />
            <div className="relative z-40 mt-2 rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
              {([
                { label: "Dashboard",   icon: Home,         href: "/dashboard",   color: "#D4AF37", desc: "Overview, widgets & projects" },
                { label: "Project Hub", icon: FolderKanban,  href: "/project-hub", color: "#D4AF37", desc: "RFIs, schedules & budgets" },
                { label: "Analytics",   icon: BarChart3,    href: "/analytics",   color: "#6366F1", desc: "Reports & performance insights" },
                { label: "SlateDrop",   icon: Layers,      href: "/slatedrop",    color: "#D4AF37", desc: "Files, folders & secure sharing" },
              ]).map((item) => {
                const NavIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onToggle}
                    className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${item.color}18` }}
                    >
                      <NavIcon size={16} style={{ color: item.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 leading-tight">{item.label}</p>
                      <p className="text-xs text-gray-500 leading-snug truncate">{item.desc}</p>
                    </div>
                  </Link>
                );
              })}
              <div className="px-4 py-3 bg-gradient-to-r from-[#D4AF37]/5 to-zinc-900/5 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-center">Powered by Slate360</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
