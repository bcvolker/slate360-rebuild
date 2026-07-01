"use client";



import Link from "next/link";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import {

  isMainMobileTabRoute,

  mainMobileTabs,

  MAIN_MOBILE_TAB_ROUTE_PREFIXES,

  resolveMainMobileHeaderMeta,

  resolveMainMobileTabKey,

  type MainMobileHeaderMeta,

  type MainMobileTab,

  type MainMobileTabKey,

} from "./mainMobileTabs";

import { SAFE_AREA_INSET_BOTTOM } from "@/lib/capacitor/safe-area-inset";
import { mobileTokens } from "./mobileTokens";



export type MobilePlatformNavKey = MainMobileTabKey;

export type MobileBottomNavItem<Key extends string = string> = MainMobileTab<Key>;

export type MobilePlatformHeaderMeta = MainMobileHeaderMeta;



export const MOBILE_PLATFORM_NAV_ITEMS = mainMobileTabs;

export const MOBILE_PLATFORM_ROUTE_PREFIXES = MAIN_MOBILE_TAB_ROUTE_PREFIXES;

export const isMobilePlatformRoute = isMainMobileTabRoute;

export const resolveMobilePlatformNavKey = resolveMainMobileTabKey;

export const resolveMobilePlatformHeaderMeta = resolveMainMobileHeaderMeta;



type MobileBottomNavProps<Key extends string = string> = {

  items: MobileBottomNavItem<Key>[];

  activeKey: Key;

  ariaLabel?: string;

  className?: string;

};



export function MobileBottomNav<Key extends string = string>({

  items,

  activeKey,

  ariaLabel = "Platform",

  className,

}: MobileBottomNavProps<Key>) {

  return (

    <nav

      aria-label={ariaLabel}

      data-mobile-shell-chrome="bottom-nav"

      className={cn(mobileTokens.mobileBottomNavBar, className)}

      style={{ paddingBottom: SAFE_AREA_INSET_BOTTOM, paddingTop: "4px" }}

    >

      <ul className="flex min-h-[58px] w-full items-stretch justify-around px-2">

        {items.map(({ key, label, icon: Icon, href, onSelect }) => {

          const active = activeKey === key;

          const itemClassName = cn(

            "relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",

            active ? mobileTokens.mobileBottomNavItemActive : mobileTokens.mobileBottomNavItemIdle,

          );

          const content = (

            <>

              {active ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-4 top-0 h-0.5 rounded-sm bg-[var(--mobile-shell-accent)]"
                />
              ) : null}

              <Icon size={18} strokeWidth={active ? 2.5 : 2} />

              <span className={mobileTokens.mobileBottomNavLabel}>{label}</span>

            </>

          );



          return (

            <li key={key} className="min-w-0 flex-1 px-0.5">

              {href ? (

                <Link

                  href={href}

                  prefetch

                  className={itemClassName}

                  aria-current={active ? "page" : undefined}

                >

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



/** Canonical bottom nav for clean (mobile) platform shells. */

export function MobilePlatformBottomNav({ className }: { className?: string }) {

  const pathname = usePathname() ?? "";

  const activeKey = resolveMainMobileTabKey(pathname);

  return (

    <MobileBottomNav

      items={mainMobileTabs}

      activeKey={activeKey}

      ariaLabel="Platform"

      className={className}

    />

  );

}

