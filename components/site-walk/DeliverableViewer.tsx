"use client";

import type { EditorBlock } from "@/lib/types/blocks";
import { cn } from "@/lib/utils";
import { FileText, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface DeliverableViewerProps {
  title: string;
  deliverableType: string;
  content: EditorBlock[];
  orgName: string;
  sharedAt: string | null;
}

export function DeliverableViewer({
  title,
  deliverableType,
  content,
  orgName,
  sharedAt,
}: DeliverableViewerProps) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-amber-500" />
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {title}
              </h1>
              <p className="text-xs text-zinc-500">
                {orgName && <span>{orgName} &middot; </span>}
                <span className="capitalize">{deliverableType}</span>
                {sharedAt && (
                  <span>
                    {" "}
                    &middot; Shared{" "}
                    {new Date(sharedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl space-y-4 px-6 py-8">
        {content.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-400">
            This deliverable has no content.
          </p>
        )}
        {content.map((block) => (
          <ViewBlock key={block.id} block={block} />
        ))}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
        Powered by{" "}
        <a
          href="https://www.slate360.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-amber-500 hover:underline"
        >
          Slate360
        </a>
      </footer>
    </div>
  );
}

function ViewBlock({ block }: { block: EditorBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <div
          className={cn(
            "font-bold text-zinc-900 dark:text-zinc-100",
            block.level === 1 && "text-2xl",
            block.level === 2 && "text-xl",
            block.level === 3 && "text-lg",
          )}
        >
          {block.content}
        </div>
      );
    case "text":
      return (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {block.content}
        </p>
      );
    case "image":
      return (
        <figure className="space-y-1">
          {block.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.src}
              alt={block.alt || "Deliverable image"}
              className="max-h-96 w-full rounded-md object-cover"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800">
              <span className="text-xs text-zinc-400">Image unavailable</span>
            </div>
          )}
          {block.caption && (
            <figcaption className="text-center text-xs text-zinc-500">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    case "divider":
      return <hr className="border-zinc-200 dark:border-zinc-800" />;
    case "callout":
      return <CalloutView block={block} />;
    default:
      return null;
  }
}

function CalloutView({
  block,
}: {
  block: Extract<EditorBlock, { type: "callout" }>;
}) {
  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
    warning:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  };

  const Icon =
    block.variant === "warning"
      ? AlertTriangle
      : block.variant === "success"
        ? CheckCircle2
        : Info;

  return (
    <div className={cn("flex items-start gap-2 rounded-md border p-3", styles[block.variant])}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{block.content}</p>
    </div>
  );
}
