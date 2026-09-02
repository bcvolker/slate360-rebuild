"use client";

import { SlateLogo } from "@/components/shared/SlateLogo";

export const SLATE360_MARK_SRC = "/uploads/slate360-logo-reversed-v2.svg";

export function ViewerBrandMark({
  logoUrl,
  opacity = 0.88,
  className = "sw-brand-mark",
}: {
  logoUrl?: string | null;
  opacity?: number;
  className?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" className={className} data-testid="client-logo" style={{ opacity }} />
    );
  }
  return (
    <span className={className} data-testid="slate360-logo" style={{ opacity }}>
      <SlateLogo size="sm" />
    </span>
  );
}
