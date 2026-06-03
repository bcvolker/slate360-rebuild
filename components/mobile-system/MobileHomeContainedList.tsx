"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileHomeContainedListProps = {
  children: ReactNode;
  className?: string;
};

/** Scrollable list capped with bottom fade — never pushes shell layout. */
export function MobileHomeContainedList({
  children,
  className,
}: MobileHomeContainedListProps) {
  return (
    <div className={cn(mobileTokens.mobileHomeContainedList, className)}>
      <div className={mobileTokens.mobileHomeContainedListScroll}>
        <div className={mobileTokens.mobileHomeContainedListInner}>{children}</div>
      </div>
      <div className={mobileTokens.mobileHomeListBottomFade} aria-hidden />
    </div>
  );
}
