"use client";

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
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl || SLATE360_MARK_SRC}
      alt={logoUrl ? "" : "Slate360"}
      className={className}
      data-testid={logoUrl ? "client-logo" : "slate360-logo"}
      style={{ opacity }}
    />
  );
}
