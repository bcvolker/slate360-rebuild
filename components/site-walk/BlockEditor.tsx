"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Save, Eye } from "lucide-react";
import Link from "next/link";
import type { EditorBlock, BlockType } from "@/lib/types/blocks";
import { createBlock } from "@/lib/types/blocks";
import { BlockToolbar } from "./BlockToolbar";
import { BlockRenderer } from "./BlockRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

interface BlockEditorProps {
  projectId: string;
}

export function BlockEditor({ projectId }: BlockEditorProps) {
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [preview, setPreview] = useState(false);

  const addBlock = useCallback((type: BlockType) => {
    setBlocks((prev) => [...prev, createBlock(type)]);
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<EditorBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } as EditorBlock : b))
    );
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
        <div className="flex items-center gap-3">
          <Link href={`/site-walk/${projectId}`}>
            <Button variant="ghost" size="icon-sm" aria-label="Back">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-semibold">New Deliverable</h1>
            <p className="text-xs text-muted-foreground">
              Project {projectId.slice(0, 8)}…
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreview(!preview)}
          >
            <Eye className="size-4" />
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button
            size="sm"
            className="bg-[var(--slate-orange)] text-white hover:bg-[var(--slate-orange-hover)]"
            disabled={!title.trim() || blocks.length === 0}
          >
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </header>

      {/* Editor content */}
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        {/* Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Deliverable title…"
          className="mb-8 border-none bg-transparent p-0 text-2xl font-bold shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
          readOnly={preview}
        />

        {/* Blocks */}
        {blocks.length === 0 && !preview ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No blocks yet. Add one to get started.
            </p>
            <div className="mt-4">
              <BlockToolbar onAddBlock={addBlock} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 pl-10 pr-10">
            {blocks.map((block) => (
              <BlockRenderer
                key={block.id}
                block={block}
                onUpdate={updateBlock}
                onDelete={deleteBlock}
              />
            ))}

            {!preview && (
              <div className="flex justify-center pt-4">
                <BlockToolbar onAddBlock={addBlock} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
