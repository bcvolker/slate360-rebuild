"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileHomeSectionBlockProps = {
  label: string;
  accent?: "primary" | "info";
  className?: string;
  children: ReactNode;
};

export function MobileHomeSectionBlock({
  label,
  accent = "primary",
  className,
  children,
}: MobileHomeSectionBlockProps) {
  const accentClass =
    accent === "info"
      ? mobileTokens.mobileHomeSectionLabelAccentInfo
      : mobileTokens.mobileHomeSectionLabelAccentPrimary;

  return (
    <section className={cn("flex min-h-0 flex-col gap-2", className)}>
      <div className={mobileTokens.mobileHomeSectionHeader}>
        <span className={accentClass} aria-hidden />
        <p className={mobileTokens.mobileHomeSectionTitle}>{label}</p>
      </div>
      {children}
    </section>
  );
}
