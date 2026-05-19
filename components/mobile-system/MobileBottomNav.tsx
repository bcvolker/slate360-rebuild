"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { cn } from "@/lib/utils";

export type MobileBottomNavItem<Key extends string = string> = {
  key: Key;
  label: string;
  icon: ElementType;
  href?: string;
  onSelect?: () => void;
};

type MobileBottomNavProps<Key extends string = string> = {
  items: MobileBottomNavItem<Key>[];
  activeKey: Key;
  ariaLabel?: string;
  className?: string;
};

export function MobileBottomNav<Key extends string = string>({
  items,
  activeKey,
  ariaLabel = "Primary",
  className,
}: MobileBottomNavProps<Key>) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "shrink-0 lg:hidden rounded-t-3xl border-t border-white/10 bg-[#0B0F15]/88 shadow-lg backdrop-blur-md",
        className,
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingTop: "4px" }}
    >
      <ul className="flex min-h-[70px] w-full items-stretch justify-around px-2">
        {items.map(({ key, label, icon: Icon, href, onSelect }) => {
          const active = activeKey === key;
          const itemClassName = cn(
            "relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
            active ? "bg-amber-500/10 text-amber-500" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
          );
          const content = (
            <>
              {active && (
                <span
                  aria-hidden
                  className="absolute left-1/2 top-0 h-[2px] w-8 -translate-x-1/2 rounded-b-full bg-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.45)]"
                />
              )}
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 2}
                className={cn("transition-transform", active && "-translate-y-0.5")}
              />
              <span className={cn("truncate text-[10px] font-medium leading-none", active && "font-semibold")}>
                {label}
              </span>
            </>
          );

          return (
            <li key={key} className="min-w-0 flex-1 px-0.5">
              {href ? (
                <Link href={href} className={itemClassName} aria-current={active ? "page" : undefined}>
                  {content}
                </Link>
              ) : (
                <button type="button" onClick={onSelect} className={itemClassName}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}