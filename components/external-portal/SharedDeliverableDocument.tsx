"use client";

import { useMemo, useState } from "react";
import type { EditorBlock } from "@/lib/types/blocks";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, Play } from "lucide-react";
import { ExternalPortalShell } from "./ExternalPortalShell";
import { PortalGlassCard } from "./PortalGlassCard";
import { TokenStatePage } from "./TokenStatePage";
import { DeliverableSlideshow } from "./DeliverableSlideshow";
import { DeliverableQnA } from "./DeliverableQnA";

export function SharedDeliverableDocument({
  title,
  deliverableType,
  content,
  orgName,
  sharedAt,
  shareToken,
}: {
  title: string;
  deliverableType: string;
  content: EditorBlock[];
  orgName: string;
  sharedAt: string | null;
  shareToken?: string | null;
}) {
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const slideable = useMemo(
    () => content.some((b) => b.type === "image" || b.type === "heading" || b.type === "text"),
    [content],
  );

  const sharedLabel =
    sharedAt &&
    new Date(sharedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (content.length === 0) {
    return (
      <TokenStatePage
        state="empty"
        badge={orgName || undefined}
        description="This shared deliverable does not include any published sections yet."
      />
    );
  }

  return (
    <ExternalPortalShell
      portalLabel="Shared deliverable"
      title={title}
      subtitle={
        [
          orgName,
          deliverableType,
          sharedLabel ? `Shared ${sharedLabel}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined
      }
      orgName={orgName}
    >
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8 sm:px-6">
        {slideable ? (
          <button
            type="button"
            onClick={() => setSlideshowOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--graphite-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--graphite-canvas)] transition-opacity hover:opacity-90"
          >
            <Play className="h-4 w-4" aria-hidden /> Play slideshow
          </button>
        ) : null}
        {content.map((block) => (
          <ViewBlock key={block.id} block={block} />
        ))}

        {shareToken ? <DeliverableQnA token={shareToken} orgName={orgName} /> : null}
      </main>

      {slideshowOpen ? (
        <DeliverableSlideshow title={title} blocks={content} onClose={() => setSlideshowOpen(false)} />
      ) : null}
    </ExternalPortalShell>
  );
}

function ViewBlock({ block }: { block: EditorBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <PortalGlassCard className="!p-4">
          <div
            className={cn(
              "font-bold text-[var(--graphite-text-header)]",
              block.level === 1 && "text-2xl",
              block.level === 2 && "text-xl",
              block.level === 3 && "text-lg",
            )}
          >
            {block.content}
          </div>
        </PortalGlassCard>
      );
    case "text":
      return (
        <p className="whitespace-pre-wrap px-1 text-sm leading-relaxed text-[var(--graphite-text-body)]">
          {block.content}
        </p>
      );
    case "image":
      return (
        <figure className="space-y-2 overflow-hidden rounded-2xl border border-white/10">
          {block.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.src}
              alt={block.alt || "Deliverable image"}
              className="max-h-[28rem] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-white/[0.04]">
              <span className="text-xs text-[var(--graphite-muted)]">Image unavailable</span>
            </div>
          )}
          {block.caption ? (
            <figcaption className="px-3 pb-3 text-center text-xs text-[var(--graphite-muted)]">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    case "divider":
      return <hr className="border-white/10" />;
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
    info: "border-[color-mix(in_srgb,var(--graphite-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-text-body)]",
    warning: "border-[color-mix(in_srgb,var(--graphite-muted)_40%,transparent)] bg-[color-mix(in_srgb,var(--graphite-muted)_12%,transparent)] text-[var(--graphite-text-body)]",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  };

  const Icon =
    block.variant === "warning"
      ? AlertTriangle
      : block.variant === "success"
        ? CheckCircle2
        : Info;

  return (
    <div className={cn("flex items-start gap-2 rounded-xl border p-4", styles[block.variant])}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{block.content}</p>
    </div>
  );
}
