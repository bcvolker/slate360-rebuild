"use client";

import Link from "next/link";
import {
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  Home,
  User,
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
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-primary text-primary-foreground shadow-gold-glow hover:shadow-xl transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <LayoutDashboard size={16} />
            </div>
            <div className="text-left">
              <p className="text-sm font-black tracking-wide">Quick Access</p>
              <p className="text-[11px] text-primary-foreground/60">Navigate modules &amp; tools</p>
            </div>
          </div>
          <ChevronDown size={16} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={onToggle} />
            <div className="relative z-40 mt-2 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              {([
                { label: "Command Center", icon: Home,      href: "/dashboard",   desc: "Overview, recent files, and projects" },
                { label: "Projects",    icon: FolderKanban,  href: "/projects",    desc: "Project details, photos & punch list" },
                { label: "My Account",  icon: User,         href: "/my-account",  desc: "Billing, usage, security & profile" },
              ]).map((item) => {
                const NavIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onToggle}
                    className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-accent active:bg-accent/80 transition-colors border-b border-border last:border-0"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10"
                    >
                      <NavIcon size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground leading-tight">{item.label}</p>
                      <p className="text-xs text-muted-foreground leading-snug truncate">{item.desc}</p>
                    </div>
                  </Link>
                );
              })}
              <div className="px-4 py-3 bg-primary/5 border-t border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">Powered by Slate360</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
