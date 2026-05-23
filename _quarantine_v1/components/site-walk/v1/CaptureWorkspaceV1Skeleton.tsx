"use client";

import { ArrowLeft, Square, X, Paperclip, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type CaptureWorkspaceV1SkeletonProps = {
  onBack?: () => void;
  onStopContext?: () => void;
  onExit?: () => void;
  className?: string;
};

export function CaptureWorkspaceV1Skeleton({
  onBack,
  onStopContext,
  onExit,
  className,
}: CaptureWorkspaceV1SkeletonProps) {
  return (
    <div className={cn("flex h-[100dvh] flex-col bg-zinc-950", className)}>
      {/* Header */}
      <header className="flex h-12 items-center gap-2 border-b border-white/10 bg-zinc-900/80 px-3 backdrop-blur-sm">
        {onBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label="Back to plan"
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Button>
        )}

        <span className="flex-1 truncate text-sm font-medium text-white">
          Capture
        </span>

        {onStopContext && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStopContext}
            className="gap-1 text-xs text-zinc-400 hover:text-white"
          >
            <Square className="size-3" />
            Stop
          </Button>
        )}

        {onExit && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onExit}
            aria-label="Exit walk"
            className="text-zinc-400 hover:text-white"
          >
            <X className="size-5" />
          </Button>
        )}
      </header>

      {/* Photo / Camera stage */}
      <div className="relative flex flex-1 items-center justify-center bg-zinc-900">
        <div className="flex flex-col items-center gap-2">
          <div className="size-16 rounded-xl bg-zinc-800" />
          <p className="text-xs text-zinc-600">Camera / photo stage</p>
        </div>
      </div>

      {/* Bottom sheet tabs */}
      <div className="border-t border-white/10 bg-zinc-900/90 backdrop-blur-sm">
        <Tabs defaultValue="details" className="flex flex-col">
          <TabsList className="mx-3 mt-2 h-8 w-auto bg-white/5">
            <TabsTrigger
              value="details"
              className="flex-1 rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="attachments"
              className="flex-1 gap-1 rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              <Paperclip className="size-3" />
              Attachments
            </TabsTrigger>
            <TabsTrigger
              value="markup"
              className="flex-1 gap-1 rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              <PenTool className="size-3" />
              Markup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="px-3 py-3">
            <p className="text-xs text-zinc-500">Title, classification, notes fields</p>
          </TabsContent>
          <TabsContent value="attachments" className="px-3 py-3">
            <p className="text-xs text-zinc-500">File attachments area</p>
          </TabsContent>
          <TabsContent value="markup" className="px-3 py-3">
            <p className="text-xs text-zinc-500">Markup tools area</p>
          </TabsContent>
        </Tabs>

        {/* Primary save button */}
        <div className="px-3 pb-4 pt-1">
          <Button className="w-full rounded-xl bg-amber-600 text-white hover:bg-amber-700">
            Save Capture
          </Button>
        </div>
      </div>
    </div>
  );
}
