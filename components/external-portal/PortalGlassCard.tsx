import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Light card for client share surfaces (the name is kept for callers). */
export function PortalGlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "twin";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--portal-line)] bg-[var(--portal-surface)] p-6 text-[var(--portal-ink)] shadow-[0_10px_30px_-18px_rgba(26,36,51,0.25)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
