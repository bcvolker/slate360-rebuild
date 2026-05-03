import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * GlassCard — Level 1 dark glass surface for the app shell.
 *
 * Provides: slate-900/60 background, backdrop-blur, slate-700/60 border,
 * and a strong shadow for depth separation against the #0B0F15 base canvas.
 *
 * Use className to override padding, radius, or border style (e.g. border-dashed).
 */
export default function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cn(
        "bg-slate-900/60 backdrop-blur-md border border-slate-700/60",
        "rounded-3xl shadow-lg shadow-black/40",
        "transition-colors duration-150",
        className,
      )}
    >
      {children}
    </div>
  );
}
