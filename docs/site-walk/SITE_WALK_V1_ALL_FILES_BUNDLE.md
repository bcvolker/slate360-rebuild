# Site Walk V1 UI Replacement Layer — All Files Bundle

This file contains every file created for the V1 UI replacement layer. Use it to share the full implementation with another AI assistant or reviewer. Each section is one file with its exact path.

---

## FILE: components/site-walk/v1/SiteWalkV1Header.tsx

```tsx
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
```

---

## FILE: components/site-walk/v1/SiteWalkV1BottomNav.tsx

```tsx
"use client";

import { Home, MapPin, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type V1NavTab = "home" | "worksites" | "reports" | "account";

type SiteWalkV1BottomNavProps = {
  activeTab: V1NavTab;
  onTabChange: (tab: V1NavTab) => void;
};

const tabs: { id: V1NavTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "worksites", label: "Worksites", icon: MapPin },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "account", label: "Account", icon: User },
];

export function SiteWalkV1BottomNav({
  activeTab,
  onTabChange,
}: SiteWalkV1BottomNavProps) {
  return (
    <nav className="flex h-14 items-stretch border-t border-white/10 bg-zinc-900/90 backdrop-blur-sm">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
              active
                ? "text-amber-500"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

---

## FILE: components/site-walk/v1/SiteWalkV1Shell.tsx

```tsx
"use client";

import type { ReactNode } from "react";
import { SiteWalkV1Header } from "./SiteWalkV1Header";
import {
  SiteWalkV1BottomNav,
  type V1NavTab,
} from "./SiteWalkV1BottomNav";
import { cn } from "@/lib/utils";

type SiteWalkV1ShellProps = {
  title: string;
  activeTab: V1NavTab;
  onTabChange: (tab: V1NavTab) => void;
  onBack?: () => void;
  primaryAction?: { label: string; onClick: () => void };
  overflowActions?: { label: string; onClick: () => void; destructive?: boolean }[];
  showBottomNav?: boolean;
  children: ReactNode;
  className?: string;
};

export function SiteWalkV1Shell({
  title,
  activeTab,
  onTabChange,
  onBack,
  primaryAction,
  overflowActions,
  showBottomNav = true,
  children,
  className,
}: SiteWalkV1ShellProps) {
  return (
    <div className="flex h-[100dvh] flex-col bg-zinc-950">
      <SiteWalkV1Header
        title={title}
        onBack={onBack}
        primaryAction={primaryAction}
        overflowActions={overflowActions}
      />

      <main className={cn("flex-1 overflow-y-auto", className)}>
        {children}
      </main>

      {showBottomNav && (
        <SiteWalkV1BottomNav
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      )}
    </div>
  );
}
```

---

## FILE: components/site-walk/v1/SiteWalkV1ActionGrid.tsx

```tsx
"use client";

import { Plus, Play, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionItem = {
  id: string;
  label: string;
  icon: typeof Plus;
  onClick: () => void;
};

type SiteWalkV1ActionGridProps = {
  onNewWorksite?: () => void;
  onStartWalk?: () => void;
  onQuickCapture?: () => void;
  className?: string;
};

export function SiteWalkV1ActionGrid({
  onNewWorksite,
  onStartWalk,
  onQuickCapture,
  className,
}: SiteWalkV1ActionGridProps) {
  const actions: ActionItem[] = [
    {
      id: "new-worksite",
      label: "New Worksite",
      icon: Plus,
      onClick: onNewWorksite ?? (() => {}),
    },
    {
      id: "start-walk",
      label: "Start Walk",
      icon: Play,
      onClick: onStartWalk ?? (() => {}),
    },
    {
      id: "quick-capture",
      label: "Quick Capture",
      icon: Camera,
      onClick: onQuickCapture ?? (() => {}),
    },
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-3 px-4 py-3", className)}>
      {actions.map(({ id, label, icon: Icon, onClick }) => (
        <button
          key={id}
          type="button"
          onClick={onClick}
          className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-zinc-300 transition-colors hover:border-amber-500/30 hover:bg-white/10 hover:text-white"
        >
          <Icon className="size-6 text-amber-500" />
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}
```

---

## FILE: components/site-walk/v1/SiteWalkV1RowMenu.tsx

```tsx
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
```

---

## FILE: components/site-walk/v1/SiteWalkV1ListPanel.tsx

```tsx
"use client";

import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type ListTab = "active" | "recent" | "worksites" | "issues";

type SiteWalkV1ListPanelProps = {
  defaultTab?: ListTab;
  activeContent: ReactNode;
  recentContent: ReactNode;
  worksitesContent: ReactNode;
  issuesContent: ReactNode;
  className?: string;
};

const tabDefs: { value: ListTab; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "recent", label: "Recent" },
  { value: "worksites", label: "Worksites" },
  { value: "issues", label: "Issues" },
];

export function SiteWalkV1ListPanel({
  defaultTab = "active",
  activeContent,
  recentContent,
  worksitesContent,
  issuesContent,
  className,
}: SiteWalkV1ListPanelProps) {
  const contentMap: Record<ListTab, ReactNode> = {
    active: activeContent,
    recent: recentContent,
    worksites: worksitesContent,
    issues: issuesContent,
  };

  return (
    <div className={cn("flex flex-1 flex-col px-4 pb-2", className)}>
      <Tabs defaultValue={defaultTab} className="flex flex-1 flex-col">
        <TabsList className="h-9 w-full bg-white/5">
          {tabDefs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-1 rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabDefs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="mt-2 flex-1"
          >
            {contentMap[tab.value]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
```

---

## FILE: components/site-walk/v1/WorksiteV1Row.tsx

```tsx
"use client";

import { MapPin } from "lucide-react";
import { SiteWalkV1RowMenu, type RowAction } from "./SiteWalkV1RowMenu";
import { cn } from "@/lib/utils";

type WorksiteV1RowProps = {
  name: string;
  walkCount: number;
  lastActivity: string | null;
  onOpen: () => void;
  onStartWalk: () => void;
  onPlanRoom: () => void;
  onSlateDrop: () => void;
  onRename?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  className?: string;
};

export function WorksiteV1Row({
  name,
  walkCount,
  lastActivity,
  onOpen,
  onStartWalk,
  onPlanRoom,
  onSlateDrop,
  onRename,
  onArchive,
  onDelete,
  className,
}: WorksiteV1RowProps) {
  const actions: RowAction[] = [
    { label: "Open", onClick: onOpen },
    { label: "Start Walk", onClick: onStartWalk },
    { label: "Plan Room", onClick: onPlanRoom },
    { label: "SlateDrop", onClick: onSlateDrop },
    ...(onRename ? [{ label: "Rename", onClick: onRename }] : []),
    ...(onArchive
      ? [{ label: "Archive", onClick: onArchive, separator: true }]
      : []),
    ...(onDelete
      ? [{ label: "Delete", onClick: onDelete, destructive: true }]
      : []),
  ];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3 transition-colors hover:bg-white/[0.06]",
        className,
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
        <MapPin className="size-4" />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-medium text-white">{name}</p>
        <p className="text-xs text-zinc-500">
          {walkCount} {walkCount === 1 ? "walk" : "walks"}
          {lastActivity && <span className="ml-2">&middot; {lastActivity}</span>}
        </p>
      </button>

      <SiteWalkV1RowMenu actions={actions} />
    </div>
  );
}
```

---

## FILE: components/site-walk/v1/WalkV1Row.tsx

```tsx
"use client";

import { SiteWalkV1RowMenu, type RowAction } from "./SiteWalkV1RowMenu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type WalkV1RowProps = {
  title: string;
  worksiteName: string | null;
  status: string;
  itemCount: number;
  lastUpdated: string;
  onOpen: () => void;
  onRename?: () => void;
  onLinkWorksite?: () => void;
  onCreateReport?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  className?: string;
};

const statusColors: Record<string, string> = {
  draft: "border-zinc-600 bg-zinc-800 text-zinc-400",
  in_progress: "border-amber-600/40 bg-amber-900/30 text-amber-400",
  completed: "border-teal-600/40 bg-teal-900/30 text-teal-400",
  archived: "border-zinc-700 bg-zinc-800/50 text-zinc-500",
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function WalkV1Row({
  title,
  worksiteName,
  status,
  itemCount,
  lastUpdated,
  onOpen,
  onRename,
  onLinkWorksite,
  onCreateReport,
  onArchive,
  onDelete,
  className,
}: WalkV1RowProps) {
  const actions: RowAction[] = [
    { label: "Open", onClick: onOpen },
    ...(onRename ? [{ label: "Rename", onClick: onRename }] : []),
    ...(onLinkWorksite
      ? [{ label: "Link Worksite", onClick: onLinkWorksite }]
      : []),
    ...(onCreateReport
      ? [{ label: "Create Report", onClick: onCreateReport }]
      : []),
    ...(onArchive
      ? [{ label: "Archive", onClick: onArchive, separator: true }]
      : []),
    ...(onDelete
      ? [{ label: "Delete", onClick: onDelete, destructive: true }]
      : []),
  ];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3 transition-colors hover:bg-white/[0.06]",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-white">{title}</p>
          <Badge
            variant="outline"
            className={cn(
              "rounded-md px-1.5 py-0 text-[10px]",
              statusColors[status] ?? statusColors.draft,
            )}
          >
            {statusLabel(status)}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          {worksiteName ?? "No worksite"}
          <span className="mx-1.5">&middot;</span>
          {itemCount} {itemCount === 1 ? "item" : "items"}
          <span className="mx-1.5">&middot;</span>
          {lastUpdated}
        </p>
      </button>

      <SiteWalkV1RowMenu actions={actions} />
    </div>
  );
}
```

---

## FILE: components/site-walk/v1/ReportV1Row.tsx

```tsx
"use client";

import { FileText } from "lucide-react";
import { SiteWalkV1RowMenu, type RowAction } from "./SiteWalkV1RowMenu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ReportV1RowProps = {
  title: string;
  sourceWalk: string | null;
  reportType: string;
  lastUpdated: string;
  onOpen: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  className?: string;
};

function typeLabel(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ReportV1Row({
  title,
  sourceWalk,
  reportType,
  lastUpdated,
  onOpen,
  onShare,
  onDelete,
  className,
}: ReportV1RowProps) {
  const actions: RowAction[] = [
    { label: "Open", onClick: onOpen },
    ...(onShare ? [{ label: "Share", onClick: onShare }] : []),
    ...(onDelete
      ? [{ label: "Delete", onClick: onDelete, destructive: true, separator: true }]
      : []),
  ];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3 transition-colors hover:bg-white/[0.06]",
        className,
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500">
        <FileText className="size-4" />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-medium text-white">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {sourceWalk ?? "Standalone"}
          <span className="mx-1.5">&middot;</span>
          {lastUpdated}
        </p>
      </button>

      <Badge
        variant="outline"
        className="rounded-md border-zinc-700 bg-zinc-800/50 px-1.5 py-0 text-[10px] text-zinc-400"
      >
        {typeLabel(reportType)}
      </Badge>

      <SiteWalkV1RowMenu actions={actions} />
    </div>
  );
}
```

---

## FILE: components/site-walk/v1/PlanWorkspaceV1Skeleton.tsx

```tsx
"use client";

import { Layers, Search, MapPin, Grid3X3 } from "lucide-react";
import { SiteWalkV1Header } from "./SiteWalkV1Header";
import { cn } from "@/lib/utils";

type PlanWorkspaceV1SkeletonProps = {
  worksiteName?: string;
  walkTitle?: string;
  onBack?: () => void;
  className?: string;
};

const toolbarItems = [
  { id: "sheets", icon: Grid3X3, label: "Sheets" },
  { id: "search", icon: Search, label: "Search" },
  { id: "pins", icon: MapPin, label: "Pins" },
  { id: "layers", icon: Layers, label: "Layers" },
] as const;

export function PlanWorkspaceV1Skeleton({
  worksiteName = "Worksite",
  walkTitle = "Walk",
  onBack,
  className,
}: PlanWorkspaceV1SkeletonProps) {
  const headerTitle = `${worksiteName} — ${walkTitle}`;

  return (
    <div className={cn("flex h-[100dvh] flex-col bg-zinc-950", className)}>
      <SiteWalkV1Header
        title={headerTitle}
        onBack={onBack}
        primaryAction={{ label: "Capture", onClick: () => {} }}
      />

      {/* Canvas zone — full remaining height */}
      <div className="relative flex-1 bg-zinc-900">
        {/* Sheet rail placeholder — top compact strip */}
        <div className="absolute inset-x-0 top-0 z-10 flex h-10 items-center gap-2 border-b border-white/5 bg-zinc-950/80 px-3 backdrop-blur-sm">
          <span className="text-xs font-medium text-zinc-400">Sheet 1</span>
          <span className="text-xs text-zinc-600">/</span>
          <span className="text-xs text-zinc-600">3 sheets</span>
        </div>

        {/* Canvas placeholder */}
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-zinc-600">Plan canvas area</p>
        </div>
      </div>

      {/* Bottom tools bar */}
      <div className="flex h-12 items-stretch border-t border-white/10 bg-zinc-900/90 backdrop-blur-sm">
        {toolbarItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## FILE: components/site-walk/v1/CaptureWorkspaceV1Skeleton.tsx

```tsx
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
```

---

## FILE: app/site-walk-v1-preview/page.tsx

```tsx
"use client";

import { useState } from "react";
import { SiteWalkV1Shell } from "@/components/site-walk/v1/SiteWalkV1Shell";
import { SiteWalkV1ActionGrid } from "@/components/site-walk/v1/SiteWalkV1ActionGrid";
import { SiteWalkV1ListPanel } from "@/components/site-walk/v1/SiteWalkV1ListPanel";
import { WorksiteV1Row } from "@/components/site-walk/v1/WorksiteV1Row";
import { WalkV1Row } from "@/components/site-walk/v1/WalkV1Row";
import { ReportV1Row } from "@/components/site-walk/v1/ReportV1Row";
import { PlanWorkspaceV1Skeleton } from "@/components/site-walk/v1/PlanWorkspaceV1Skeleton";
import { CaptureWorkspaceV1Skeleton } from "@/components/site-walk/v1/CaptureWorkspaceV1Skeleton";
import type { V1NavTab } from "@/components/site-walk/v1/SiteWalkV1BottomNav";
import { Button } from "@/components/ui/button";
import { Settings, MessageSquare, HelpCircle, User, FolderOpen } from "lucide-react";

type PreviewScreen = "shell" | "plan" | "capture";

export default function SiteWalkV1PreviewPage() {
  const [tab, setTab] = useState<V1NavTab>("home");
  const [screen, setScreen] = useState<PreviewScreen>("shell");

  if (screen === "plan") {
    return (
      <PlanWorkspaceV1Skeleton
        worksiteName="Main Building"
        walkTitle="Foundation Inspection"
        onBack={() => setScreen("shell")}
      />
    );
  }

  if (screen === "capture") {
    return (
      <CaptureWorkspaceV1Skeleton
        onBack={() => setScreen("plan")}
        onStopContext={() => {}}
        onExit={() => setScreen("shell")}
      />
    );
  }

  return (
    <SiteWalkV1Shell
      title={shellTitle(tab)}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "home" && (
        <HomeView
          onOpenPlan={() => setScreen("plan")}
          onOpenCapture={() => setScreen("capture")}
        />
      )}
      {tab === "worksites" && <WorksitesView onOpenPlan={() => setScreen("plan")} />}
      {tab === "reports" && <ReportsView />}
      {tab === "account" && <AccountView />}
    </SiteWalkV1Shell>
  );
}

function shellTitle(tab: V1NavTab): string {
  switch (tab) {
    case "home":
      return "Site Walk";
    case "worksites":
      return "Worksites";
    case "reports":
      return "Reports";
    case "account":
      return "Account";
  }
}

/* ---------- Home ---------- */

function HomeView({
  onOpenPlan,
  onOpenCapture,
}: {
  onOpenPlan: () => void;
  onOpenCapture: () => void;
}) {
  return (
    <>
      <SiteWalkV1ActionGrid
        onNewWorksite={() => {}}
        onStartWalk={() => {}}
        onQuickCapture={onOpenCapture}
      />
      <SiteWalkV1ListPanel
        activeContent={<EmptyList message="No active walks" />}
        recentContent={<EmptyList message="No recent walks" />}
        worksitesContent={<EmptyList message="No worksites yet" />}
        issuesContent={<EmptyList message="No open issues" />}
      />
    </>
  );
}

/* ---------- Worksites ---------- */

function WorksitesView({ onOpenPlan }: { onOpenPlan: () => void }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <EmptyList message="No worksites yet. Create a worksite to get started." />
    </div>
  );
}

/* ---------- Reports ---------- */

function ReportsView() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <EmptyList message="No reports yet. Complete a walk to create a report." />
    </div>
  );
}

/* ---------- Account ---------- */

function AccountView() {
  const items = [
    { icon: FolderOpen, label: "SlateDrop" },
    { icon: Settings, label: "Settings" },
    { icon: MessageSquare, label: "Feedback" },
    { icon: HelpCircle, label: "Help" },
    { icon: User, label: "Account" },
  ];

  return (
    <div className="flex flex-col gap-1 p-4">
      {items.map(({ icon: Icon, label }) => (
        <button
          key={label}
          type="button"
          className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5"
        >
          <Icon className="size-5 text-zinc-500" />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Shared empty state ---------- */

function EmptyList({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-zinc-600">{message}</p>
    </div>
  );
}
```

---

## FILE: docs/site-walk/SITE_WALK_V1_UI_REPLACEMENT_LAYER.md

```markdown
# Site Walk V1 UI Replacement Layer

Last Updated: 2026-05-14
Status: Preview prototype. Not wired to production routes.

## Purpose

This document tracks the new clean V1 UI layer for Site Walk. The new components live in `components/site-walk/v1/` alongside (not replacing) the existing production components. A non-production preview route at `/site-walk-v1-preview` demonstrates the new UI.

## New V1 Components

| Component | File | Purpose |
|---|---|---|
| SiteWalkV1Shell | `components/site-walk/v1/SiteWalkV1Shell.tsx` | Mobile-first shell with single header, content area, optional bottom nav |
| SiteWalkV1Header | `components/site-walk/v1/SiteWalkV1Header.tsx` | Single compact top bar with title, back, primary action, overflow menu |
| SiteWalkV1BottomNav | `components/site-walk/v1/SiteWalkV1BottomNav.tsx` | Four-tab bottom nav: Home, Worksites, Reports, Account |
| SiteWalkV1ActionGrid | `components/site-walk/v1/SiteWalkV1ActionGrid.tsx` | Compact 3-action grid: New Worksite, Start Walk, Quick Capture |
| SiteWalkV1ListPanel | `components/site-walk/v1/SiteWalkV1ListPanel.tsx` | Tabbed list area: Active, Recent, Worksites, Issues |
| SiteWalkV1RowMenu | `components/site-walk/v1/SiteWalkV1RowMenu.tsx` | Consistent three-dot row menu |
| WorksiteV1Row | `components/site-walk/v1/WorksiteV1Row.tsx` | Dense worksite row with actions |
| WalkV1Row | `components/site-walk/v1/WalkV1Row.tsx` | Dense walk row with status badge and actions |
| ReportV1Row | `components/site-walk/v1/ReportV1Row.tsx` | Report row with type badge and share/open |
| PlanWorkspaceV1Skeleton | `components/site-walk/v1/PlanWorkspaceV1Skeleton.tsx` | Static plan workspace layout skeleton |
| CaptureWorkspaceV1Skeleton | `components/site-walk/v1/CaptureWorkspaceV1Skeleton.tsx` | Static capture workspace layout skeleton |

## Old Components These Are Intended To Replace

| New V1 Component | Old Component(s) It Replaces |
|---|---|
| SiteWalkV1Shell | `SiteWalkShell.tsx`, `SiteWalkModuleNav.tsx` combined |
| SiteWalkV1Header | `SiteWalkModuleNav.tsx` header section, duplicate module header in `SiteWalkHub.tsx` |
| SiteWalkV1BottomNav | `SiteWalkModuleNav.tsx` bottom nav with different tab structure |
| SiteWalkV1ActionGrid | Giant action cards in `SiteWalkHub.tsx` command center |
| SiteWalkV1ListPanel | Tab/pill system in `SiteWalkHub.tsx` work panel |
| SiteWalkV1RowMenu | Scattered action menus across `WalkActionsMenu.tsx`, `DeleteWalkButton.tsx` |
| WorksiteV1Row | Project/worksite cards in walks page |
| WalkV1Row | Walk list items in `SiteWalkHub.tsx` and walks page |
| PlanWorkspaceV1Skeleton | `PlanViewerLeaflet.tsx` layout wrapper, `PlanToolbar.tsx` chrome |
| CaptureWorkspaceV1Skeleton | `CaptureShell.tsx`, `SharedCaptureTaskHeader.tsx`, `CaptureDataBottomSheet.tsx` layout |

## Production Routes Not Changed

- `app/site-walk/page.tsx` — unchanged
- `app/site-walk/layout.tsx` — unchanged
- `app/site-walk/(act-2-inputs)/walks/page.tsx` — unchanged
- `app/site-walk/(act-2-inputs)/capture/*` — unchanged
- All API routes — unchanged
- Trigger.dev tasks — unchanged
- Supabase schema — unchanged

## How This Stops Patching Broken UI

Instead of incrementally fixing pill-shaped controls, stacked headers, crowded layouts, and bloated drawers in the existing component tree, this layer creates a parallel clean implementation. The old components stay untouched so production continues working. The new V1 components can be reviewed, iterated, and eventually swapped in by updating production route imports.

## Design Rules Applied

1. No `rounded-full` except avatars/circular icon buttons.
2. `rounded-lg` or `rounded-xl` for cards, buttons, and containers.
3. Restrained amber only for primary actions; no saturated orange.
4. One header per screen — no duplicate module headers.
5. No passive metrics unless clickable.
6. No filler descriptions under labels.
7. Dense but readable rows.
8. Drawers/tabs for complex features.
9. Every visible element has a real purpose.

## Preview Route

`/site-walk-v1-preview` — non-production preview showing:
- Home tab with action grid and tabbed list panel
- Worksites tab with empty state
- Reports tab with empty state
- Account tab with real utility links only
- Plan workspace skeleton (accessible via navigation)
- Capture workspace skeleton (accessible via navigation)

## Next Steps After User Reviews Preview Route

1. User reviews preview route on mobile viewport and provides feedback.
2. Iterate V1 components based on feedback.
3. Wire real data from existing hooks/loaders into V1 components.
4. Create a feature-flagged swap of production route imports.
5. Physical device confirmation.
6. Replace production imports and remove old components.
```
