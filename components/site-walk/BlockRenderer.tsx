"use client";

import { Trash2, GripVertical } from "lucide-react";
import type { EditorBlock } from "@/lib/types/blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface BlockRendererProps {
  block: EditorBlock;
  onUpdate: (id: string, updates: Partial<EditorBlock>) => void;
  onDelete: (id: string) => void;
}

export function BlockRenderer({ block, onUpdate, onDelete }: BlockRendererProps) {
  return (
    <Card className="group relative">
      {/* Block controls */}
      <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="size-4 cursor-grab text-muted-foreground" />
      </div>
      <div className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onDelete(block.id)}
          aria-label="Delete block"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <CardContent>
        {block.type === "heading" && (
          <HeadingBlockContent
            block={block}
            onUpdate={onUpdate}
          />
        )}
        {block.type === "text" && (
          <TextBlockContent
            block={block}
            onUpdate={onUpdate}
          />
        )}
        {block.type === "image" && (
          <ImageBlockContent
            block={block}
            onUpdate={onUpdate}
          />
        )}
        {block.type === "divider" && <Separator />}
        {block.type === "callout" && (
          <CalloutBlockContent
            block={block}
            onUpdate={onUpdate}
          />
        )}
      </CardContent>
    </Card>
  );
}

function HeadingBlockContent({
  block,
  onUpdate,
}: {
  block: Extract<EditorBlock, { type: "heading" }>;
  onUpdate: (id: string, updates: Partial<EditorBlock>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((level) => (
          <Button
            key={level}
            variant={block.level === level ? "default" : "outline"}
            size="xs"
            onClick={() => onUpdate(block.id, { level })}
          >
            H{level}
          </Button>
        ))}
      </div>
      <Input
        value={block.content}
        onChange={(e) => onUpdate(block.id, { content: e.target.value })}
        placeholder="Heading text…"
        className={cn(
          "border-none bg-transparent p-0 font-bold shadow-none focus-visible:ring-0",
          block.level === 1 && "text-2xl",
          block.level === 2 && "text-xl",
          block.level === 3 && "text-lg"
        )}
      />
    </div>
  );
}

function TextBlockContent({
  block,
  onUpdate,
}: {
  block: Extract<EditorBlock, { type: "text" }>;
  onUpdate: (id: string, updates: Partial<EditorBlock>) => void;
}) {
  return (
    <textarea
      value={block.content}
      onChange={(e) => onUpdate(block.id, { content: e.target.value })}
      placeholder="Start writing…"
      rows={3}
      className="w-full resize-none border-none bg-transparent p-0 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
    />
  );
}

function ImageBlockContent({
  block,
  onUpdate,
}: {
  block: Extract<EditorBlock, { type: "image" }>;
  onUpdate: (id: string, updates: Partial<EditorBlock>) => void;
}) {
  return (
    <div className="space-y-3">
      {block.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.src}
          alt={block.alt || "Block image"}
          className="max-h-64 w-full rounded-md object-cover"
        />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-border bg-muted/50">
          <p className="text-xs text-muted-foreground">Paste an image URL below</p>
        </div>
      )}
      <Input
        value={block.src}
        onChange={(e) => onUpdate(block.id, { src: e.target.value })}
        placeholder="Image URL…"
        type="url"
      />
      <Input
        value={block.caption}
        onChange={(e) => onUpdate(block.id, { caption: e.target.value })}
        placeholder="Caption (optional)"
      />
    </div>
  );
}

function CalloutBlockContent({
  block,
  onUpdate,
}: {
  block: Extract<EditorBlock, { type: "callout" }>;
  onUpdate: (id: string, updates: Partial<EditorBlock>) => void;
}) {
  const variantStyles = {
    info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50",
    warning: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50",
    success: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {(["info", "warning", "success"] as const).map((v) => (
          <Button
            key={v}
            variant={block.variant === v ? "default" : "outline"}
            size="xs"
            onClick={() => onUpdate(block.id, { variant: v })}
            className="capitalize"
          >
            {v}
          </Button>
        ))}
      </div>
      <div className={cn("rounded-md border p-3", variantStyles[block.variant])}>
        <textarea
          value={block.content}
          onChange={(e) => onUpdate(block.id, { content: e.target.value })}
          placeholder="Callout message…"
          rows={2}
          className="w-full resize-none border-none bg-transparent p-0 text-sm leading-relaxed focus:outline-none"
        />
      </div>
    </div>
  );
}
