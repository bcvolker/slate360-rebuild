'use client';
import { useState } from "react";
import { Dialog } from "@headlessui/react";
import MediaViewer from "../MediaViewer";

import { Tile } from "@/lib/types";

export default function MobileViewer({ tile }: { tile: Tile }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Small viewer preview */}
      <div
        className="mx-auto mt-2 mb-4 w-2/5 h-32 min-w-120px min-h-120px max-w-180px max-h-180px rounded bg-theme-surfaceAlt flex items-center justify-center shadow-md border border-theme-borderStrong/60"
        style={{ marginLeft: 'auto', marginRight: 'auto' }}
        onClick={() => setIsOpen(true)}
      >
        <MediaViewer id={tile.id} title={tile.title} thumbnail={true} />
      </div>

      {/* Fullscreen modal */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-90p h-70p rounded bg-theme-surface p-4 border border-theme-borderStrong/50 shadow-[0_22px_55px_rgba(var(--shadow-strong)_/_0.6)]">
            <MediaViewer id={tile.id} title={tile.title} />
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 rounded bg-theme-accentSecondary px-3 py-1 text-white hover:bg-theme-accentSecondary/80 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
