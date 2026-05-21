import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileSectionProps = {
  label?: string;
  /** Subtle amber accent line above section label (/app warmth) */
  showAccentLine?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function MobileSection({
  label,
  showAccentLine = false,
  children,
  className,
  contentClassName,
}: MobileSectionProps) {
  return (
    <section className={className}>
      {label && (
        <div className="mb-1">
          {showAccentLine && <span className={mobileTokens.sectionLabelAccent} aria-hidden />}
          <p className={mobileTokens.sectionLabel}>{label}</p>
        </div>
      )}
      <div className={cn(contentClassName)}>{children}</div>
    </section>
  );
}
