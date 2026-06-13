import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { projectCreateTokens } from "./project-create-tokens";

type Props = {
  children: ReactNode;
  className?: string;
};

export function ProjectCreateGlassCard({ children, className }: Props) {
  return <div className={cn(projectCreateTokens.glassCard, className)}>{children}</div>;
}
