import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileSectionProps = {
  label?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function MobileSection({
  label,
  children,
  className,
  contentClassName,
}: MobileSectionProps) {
  return (
    <section className={className}>
      {label && <p className={mobileTokens.sectionLabel}>{label}</p>}
      <div className={cn(contentClassName)}>{children}</div>
    </section>
  );
}