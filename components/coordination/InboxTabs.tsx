"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import type React from "react";

const TABS = [
  { key: "all",           label: "All" },
  { key: "unread",        label: "Unread" },
  { key: "notifications", label: "Notifications" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function InboxTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = ((searchParams?.get("tab") ?? "all")) as TabKey;

  return (
    <div className="flex flex-col gap-3">
      {/* Tab bar */}
      <div
        className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1"
        role="tablist"
        aria-label="Inbox filter"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          if (tab.key === "all") {
            params.delete("tab");
          } else {
            params.set("tab", tab.key);
          }
          const paramStr = params.toString();
          const href: string = paramStr.length > 0 ? `${pathname}?${paramStr}` : (pathname ?? "/coordination/inbox");
          return (
            <Link
              key={tab.key}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={`flex-1 rounded-xl py-2 text-center text-xs font-black transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Scrollable content area */}
      <div className="max-h-[420px] overflow-y-auto rounded-2xl no-scrollbar">
        {children}
      </div>
    </div>
  );
}
