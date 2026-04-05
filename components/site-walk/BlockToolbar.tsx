"use client";

import {
  Heading2,
  Type,
  ImageIcon,
  Minus,
  MessageSquare,
  Plus,
} from "lucide-react";
import type { BlockType } from "@/lib/types/blocks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BlockToolbarProps {
  onAddBlock: (type: BlockType) => void;
}

const BLOCK_OPTIONS: { type: BlockType; label: string; icon: React.ElementType }[] = [
  { type: "heading", label: "Heading", icon: Heading2 },
  { type: "text", label: "Text", icon: Type },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "divider", label: "Divider", icon: Minus },
  { type: "callout", label: "Callout", icon: MessageSquare },
];

export function BlockToolbar({ onAddBlock }: BlockToolbarProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" />
          Add Block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {BLOCK_OPTIONS.map(({ type, label, icon: Icon }) => (
          <DropdownMenuItem key={type} onClick={() => onAddBlock(type)}>
            <Icon className="size-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
