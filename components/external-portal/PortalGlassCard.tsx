import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PortalGlassCard({
  children,
  className,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "twin";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-6 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.45)] backdrop-blur-md",
        variant === "twin"
          ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.45),0_0_24px_0_color-mix(in_srgb,var(--twin360-blue)_8%,transparent)]"
          : "border-white/10 bg-[rgba(15,23,42,0.55)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
