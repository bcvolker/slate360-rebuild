"use client";

import { appHomeTokens } from "@/components/studio-ui/app-home-tokens";
import { cn } from "@/lib/utils";

type MobileAppSectionLabelProps = {
  children: string;
  className?: string;
  "data-testid"?: string;
};

export function MobileAppSectionLabel({
  children,
  className,
  "data-testid": dataTestId,
}: MobileAppSectionLabelProps) {
  return (
    <p className={cn(appHomeTokens.sectionLabel, className)} data-testid={dataTestId}>
      {children}
    </p>
  );
}
