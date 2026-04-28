"use client";

import { cn } from "@/lib/utils";

type PageRef = { id: string; label: string };

type Props = {
  pages: PageRef[];
  activePageId: string;
  onSelect: (pageId: string) => void;
};

export function PagedWorkspaceRail({ pages, activePageId, onSelect }: Props) {
  return (
    <nav className="mt-3 overflow-x-auto no-scrollbar" aria-label="Workspace sections">
      <div className="flex min-w-max gap-2">
        {pages.map((page) => {
          const active = page.id === activePageId;
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onSelect(page.id)}
              className={cn(
                "h-9 rounded-full border px-4 text-sm font-black transition",
                active
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-800"
              )}
              aria-current={active ? "page" : undefined}
            >
              {page.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
