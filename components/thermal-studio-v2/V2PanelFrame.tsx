"use client";

import { type ReactNode, type RefObject, useRef, useState } from "react";
import { Panel, PanelGroup, type ImperativePanelHandle } from "react-resizable-panels";
import { PanelLeft, PanelRight } from "lucide-react";
import { StudioHandle } from "@/components/studio/StudioPanels";

type RailSlot = {
  title: string;
  content: ReactNode;
  defaultSize?: number;
  minSize?: number;
};

type DockSlot = RailSlot & {
  /** Skip the full label header bar — just a small floating collapse toggle (e.g. filmstrip). */
  compact?: boolean;
};

/**
 * Reusable resizable frame for a V2 tab body (doc §0.4): left/right rails
 * collapse to a thin labeled strip (never invisible), center is the hero,
 * an optional bottom dock (e.g. filmstrip) collapses the same way. Every
 * later slice (Library/Analyze/AI Review/Report) fills these same slots —
 * this shape must not change once content lands in them.
 */
export function V2PanelFrame({
  left,
  center,
  right,
  bottom,
  toolbar,
}: {
  left?: RailSlot;
  center: ReactNode;
  right?: RailSlot;
  bottom?: DockSlot;
  /** One-row toolbar above the center hero (e.g. Analyze's tool segmented control). */
  toolbar?: ReactNode;
}) {
  // react-resizable-panels needs an explicit defaultSize on every panel in a
  // group for a correct FIRST render (a Panel left to infer its size from
  // flex-1 alone can hydrate at a near-zero width — confirmed via DOM
  // measurement: the Library center panel rendered ~25px wide with no
  // defaultSize here). Compute the center's share from whichever rails exist.
  const centerDefaultSize = 100 - (left?.defaultSize ?? (left ? 22 : 0)) - (right?.defaultSize ?? (right ? 22 : 0));

  const body = (
    <PanelGroup direction="horizontal" className="min-h-0 flex-1">
      {left ? (
        <>
          <RailPanel side="left" order={1} {...left} />
          <StudioHandle vertical />
        </>
      ) : null}
      <Panel
        order={2}
        defaultSize={centerDefaultSize}
        minSize={30}
        data-testid="v2-viewer-panel"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas-deep)]"
      >
        {toolbar ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--mobile-app-card-border)] px-3 py-1.5">
            {toolbar}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-hidden">{center}</div>
      </Panel>
      {right ? (
        <>
          <StudioHandle vertical />
          <RailPanel side="right" order={3} {...right} />
        </>
      ) : null}
    </PanelGroup>
  );

  if (!bottom) {
    return <div className="flex h-full min-h-0 flex-col overflow-hidden">{body}</div>;
  }

  return (
    <PanelGroup direction="vertical" className="flex h-full min-h-0 flex-col overflow-hidden">
      <Panel order={1} defaultSize={100 - (bottom.defaultSize ?? 16)} minSize={30} className="flex min-h-0 flex-col overflow-hidden">
        {body}
      </Panel>
      <StudioHandle />
      <DockPanel order={2} {...bottom} />
    </PanelGroup>
  );
}

function RailPanel({
  side,
  order,
  title,
  content,
  defaultSize = 22,
  minSize = 14,
}: RailSlot & { side: "left" | "right"; order: number }) {
  const ref = useRef<ImperativePanelHandle>(null);
  return (
    <RailPanelInner
      side={side}
      order={order}
      title={title}
      defaultSize={defaultSize}
      minSize={minSize}
      panelRef={ref}
    >
      {content}
    </RailPanelInner>
  );
}

function RailPanelInner({
  side,
  order,
  title,
  defaultSize,
  minSize,
  panelRef,
  children,
}: {
  side: "left" | "right";
  order: number;
  title: string;
  defaultSize: number;
  minSize: number;
  panelRef: RefObject<ImperativePanelHandle | null>;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const Icon = side === "left" ? PanelLeft : PanelRight;
  return (
    <Panel
      ref={panelRef}
      order={order}
      defaultSize={defaultSize}
      minSize={minSize}
      collapsedSize={4}
      collapsible
      onCollapse={() => setCollapsed(true)}
      onExpand={() => setCollapsed(false)}
      className="flex min-h-0 flex-col overflow-hidden"
    >
      {collapsed ? (
        <button
          type="button"
          onClick={() => panelRef.current?.expand()}
          title={`Show ${title}`}
          className="flex h-full w-full flex-col items-center justify-start gap-2 py-3 text-[10px] font-medium uppercase tracking-wide text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        >
          <Icon className="size-3.5 shrink-0" />
          <span style={{ writingMode: "vertical-rl" }}>{title}</span>
        </button>
      ) : (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--mobile-app-card-border)] px-3 py-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {title}
            </span>
            <button
              type="button"
              onClick={() => panelRef.current?.collapse()}
              title={`Hide ${title}`}
              className="rounded p-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            >
              <Icon className="size-3.5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
        </div>
      )}
    </Panel>
  );
}

function DockPanel({
  order,
  title,
  content,
  defaultSize = 16,
  minSize = 8,
  compact = false,
}: DockSlot & { order: number }) {
  const ref = useRef<ImperativePanelHandle>(null);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Panel
      ref={ref}
      order={order}
      defaultSize={defaultSize}
      minSize={minSize}
      collapsedSize={4}
      collapsible
      onCollapse={() => setCollapsed(true)}
      onExpand={() => setCollapsed(false)}
      className="relative flex min-h-0 flex-col overflow-hidden"
    >
      {compact ? (
        <button
          type="button"
          onClick={() => (collapsed ? ref.current?.expand() : ref.current?.collapse())}
          title={collapsed ? `Show ${title}` : `Hide ${title}`}
          className="absolute right-2 top-1.5 z-10 rounded bg-black/40 p-1 text-[var(--graphite-muted)] hover:bg-black/60 hover:text-[var(--graphite-text-header)]"
        >
          {collapsed ? "▲" : "▼"}
        </button>
      ) : (
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--mobile-app-card-border)] px-3 py-1.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {title}
          </span>
          <button
            type="button"
            onClick={() => (collapsed ? ref.current?.expand() : ref.current?.collapse())}
            title={collapsed ? `Show ${title}` : `Hide ${title}`}
            className="rounded p-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          >
            {collapsed ? "▲" : "▼"}
          </button>
        </div>
      )}
      {collapsed ? null : <div className={`min-h-0 flex-1 overflow-y-auto ${compact ? "" : "p-2"}`}>{content}</div>}
    </Panel>
  );
}
