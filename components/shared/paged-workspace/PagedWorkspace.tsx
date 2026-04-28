"use client";

import { useEffect, useMemo, useState, type ReactNode, type TouchEvent } from "react";
import { cn } from "@/lib/utils";
import { PagedWorkspaceDots } from "./PagedWorkspaceDots";
import { PagedWorkspaceRail } from "./PagedWorkspaceRail";

export type PagedWorkspacePage = {
  id: string;
  label: string;
  eyebrow?: string;
  content: ReactNode;
};

type Props = {
  pages: PagedWorkspacePage[];
  initialPageId?: string;
  activePageId?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  viewportClassName?: string;
  showChrome?: boolean;
  onPageChange?: (pageId: string) => void;
};

const SWIPE_THRESHOLD = 48;

export function PagedWorkspace({ pages, initialPageId, activePageId, title, subtitle, className, viewportClassName, showChrome = true, onPageChange }: Props) {
  const initialIndex = Math.max(0, pages.findIndex((page) => page.id === initialPageId));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const activePage = pages[activeIndex] ?? pages[0];
  const canGoBack = activeIndex > 0;
  const canGoNext = activeIndex < pages.length - 1;

  const railPages = useMemo(() => pages.map((page) => ({ id: page.id, label: page.label })), [pages]);

  useEffect(() => {
    if (!activePageId) return;
    const nextIndex = pages.findIndex((page) => page.id === activePageId);
    if (nextIndex >= 0) setActiveIndex(nextIndex);
  }, [activePageId, pages]);

  function setPage(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), pages.length - 1);
    setActiveIndex(nextIndex);
    const nextPage = pages[nextIndex];
    if (nextPage) onPageChange?.(nextPage.id);
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStart === null) return;
    const delta = event.changedTouches[0].clientX - touchStart;
    setTouchStart(null);
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta < 0 && canGoNext) setPage(activeIndex + 1);
    if (delta > 0 && canGoBack) setPage(activeIndex - 1);
  }

  if (!activePage) return null;

  return (
    <section className={cn("flex h-full min-h-0 w-full flex-col overflow-hidden", className)}>
      {showChrome && (title || subtitle || pages.length > 1) && (
        <header className="shrink-0 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title && <h1 className="truncate text-lg font-black text-slate-950">{title}</h1>}
              {subtitle && <p className="mt-0.5 line-clamp-2 text-xs font-bold text-slate-600">{subtitle}</p>}
            </div>
            <PagedWorkspaceDots pages={railPages} activePageId={activePage.id} onSelect={(id) => setPage(pages.findIndex((page) => page.id === id))} />
          </div>
          {pages.length > 1 && <PagedWorkspaceRail pages={railPages} activePageId={activePage.id} onSelect={(id) => setPage(pages.findIndex((page) => page.id === id))} />}
        </header>
      )}
      <div
        className={cn("min-h-0 flex-1 overflow-hidden", viewportClassName)}
        onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
        onTouchEnd={handleTouchEnd}
      >
        {activePage.content}
      </div>
    </section>
  );
}
