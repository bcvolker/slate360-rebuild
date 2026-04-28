"use client";

import { cn } from "@/lib/utils";

type PageRef = { id: string; label: string };

type Props = {
  pages: PageRef[];
  activePageId: string;
  onSelect: (pageId: string) => void;
};

export function PagedWorkspaceDots({ pages, activePageId, onSelect }: Props) {
  if (pages.length <= 1) return null;

  return (
    <div className="flex shrink-0 items-center gap-1" aria-label="Workspace pages">
      {pages.map((page) => {
        const active = page.id === activePageId;
        return (
          <button
            key={page.id}
            type="button"
            onClick={() => onSelect(page.id)}
            className={cn(
              "h-2 rounded-full transition-all",
              active ? "w-6 bg-blue-700" : "w-2 bg-slate-300 hover:bg-slate-400"
            )}
            aria-label={`Open ${page.label}`}
            aria-current={active ? "page" : undefined}
          />
        );
      })}
    </div>
  );
}
