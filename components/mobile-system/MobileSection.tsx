import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileSectionProps = {
  label?: string;
  brandLabel?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function MobileSection({
  label,
  brandLabel,
  children,
  className,
  contentClassName,
}: MobileSectionProps) {
  return (
    <section className={className}>
      {label && (
        <p
          className={
            brandLabel
              ? mobileTokens.brandSectionLabel
              : mobileTokens.sectionLabel
          }
        >
          {label}
        </p>
      )}
      <div className={cn(contentClassName)}>{children}</div>
    </section>
  );
}