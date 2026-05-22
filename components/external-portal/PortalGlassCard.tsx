import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PortalGlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.55)] p-6 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.45)] backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
