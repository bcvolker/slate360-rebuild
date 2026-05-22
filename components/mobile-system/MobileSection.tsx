import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileSectionProps = {
  label?: string;
  /** Subtle accent line above section label — warm (amber) or cool (cyan) */
  showAccentLine?: boolean | "warm" | "cool";
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
          {showAccentLine && (
            <span
              className={
                showAccentLine === "cool"
                  ? mobileTokens.sectionLabelAccentCool
                  : mobileTokens.sectionLabelAccent
              }
              aria-hidden
            />
          )}
          <p className={mobileTokens.sectionLabel} data-testid="mobile-section-label">
            {label}
          </p>
        </div>
      )}
      {!label && showAccentLine && (
        <span
          className={
            showAccentLine === "cool"
              ? mobileTokens.sectionLabelAccentCool
              : mobileTokens.sectionLabelAccent
          }
          aria-hidden
        />
      )}
      <div className={cn(contentClassName)}>{children}</div>
    </section>
  );
}
