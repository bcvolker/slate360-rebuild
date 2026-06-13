import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { slatedropBrowserTokens } from "./slatedrop-browser-tokens";

type SlateDropGlassCardProps = {
  children: ReactNode;
  className?: string;
};

export function SlateDropGlassCard({ children, className }: SlateDropGlassCardProps) {
  return <div className={cn(slatedropBrowserTokens.glassCard, className)}>{children}</div>;
}
