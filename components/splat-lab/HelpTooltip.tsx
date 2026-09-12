"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Small help icon with a tooltip — used beside every setting to explain
 * what it does and what the recommended value is. */
export function HelpTooltip({ text, className }: { text: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Help"
          className={cn("inline-flex items-center text-[var(--graphite-muted)] hover:text-[var(--graphite-text-body)]", className)}
        >
          <HelpCircle className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-left leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
