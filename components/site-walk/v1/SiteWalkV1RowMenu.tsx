"use client";

import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type RowAction = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  separator?: boolean;
};

type SiteWalkV1RowMenuProps = {
  actions: RowAction[];
};

export function SiteWalkV1RowMenu({ actions }: SiteWalkV1RowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Row actions"
          className="text-zinc-500 hover:text-white"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[160px] border-white/10 bg-zinc-900"
      >
        {actions.map((action, i) => (
          <div key={action.label}>
            {action.separator && i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={action.onClick}
              className={cn(
                "text-zinc-300",
                action.destructive && "text-red-400 focus:text-red-400",
              )}
            >
              {action.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
