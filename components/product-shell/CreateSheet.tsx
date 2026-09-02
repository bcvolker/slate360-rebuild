"use client";

import { X } from "lucide-react";
import { CREATE_GROUPS, CREATE_TILES } from "@/lib/product-shell/create-actions";

export function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-label="Create">
      <div className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto border border-white/10 bg-[var(--graphite-canvas)] p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Create</h2>
          <button type="button" onClick={onClose} className="inline-flex h-12 w-12 items-center justify-center" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {CREATE_GROUPS.map((group) => (
          <section key={group.id} className="mb-5">
            <p className="mb-2 text-xs text-[var(--graphite-muted)]">{group.label}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CREATE_TILES.filter((t) => t.group === group.id).map((tile) => (
                <a
                  key={tile.id}
                  href={tile.soon ? undefined : tile.href}
                  onClick={tile.soon ? (e) => e.preventDefault() : onClose}
                  className="min-h-16 border border-white/10 px-3 py-3 text-left"
                  aria-disabled={tile.soon || undefined}
                >
                  <p className="text-sm text-white">
                    {tile.title}
                    {tile.soon ? <span className="ml-2 text-[var(--graphite-muted)]">Coming soon</span> : null}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--graphite-text-body)]">{tile.use}</p>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
