"use client";

import { ArrowLeft, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type HeaderAction = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

type SiteWalkV1HeaderProps = {
  title: string;
  onBack?: () => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  overflowActions?: HeaderAction[];
  className?: string;
};

export function SiteWalkV1Header({
  title,
  onBack,
  primaryAction,
  overflowActions,
  className,
}: SiteWalkV1HeaderProps) {
  return (
    <header
      className={cn(
        "flex h-14 items-center gap-2 border-b border-white/10 bg-zinc-900/80 px-4 backdrop-blur-sm",
        className,
      )}
    >
      {onBack && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="Go back"
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="size-5" />
        </Button>
      )}

      <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-white">
        {title}
      </h1>

      {primaryAction && (
        <Button
          size="sm"
          onClick={primaryAction.onClick}
          className="rounded-lg bg-amber-600 text-white hover:bg-amber-700"
        >
          {primaryAction.label}
        </Button>
      )}

      {overflowActions && overflowActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="More actions"
              className="text-zinc-400 hover:text-white"
            >
              <MoreVertical className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-white/10 bg-zinc-900"
          >
            {overflowActions.map((action) => (
              <DropdownMenuItem
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "text-zinc-300",
                  action.destructive && "text-red-400",
                )}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
