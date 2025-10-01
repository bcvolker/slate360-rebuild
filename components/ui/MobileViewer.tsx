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
        className="mx-auto mt-2 mb-4 w-1/4 h-20 min-w-[64px] min-h-[64px] max-w-[96px] max-h-[96px] rounded bg-slate-800 flex items-center justify-center shadow-md border border-slate-700"
        style={{ marginLeft: 'auto', marginRight: 'auto' }}
        onClick={() => setIsOpen(true)}
      >
        <MediaViewer id={tile.id} title={tile.title} thumbnail={true} />
      </div>

      {/* Fullscreen modal */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-[90%] h-[70%] rounded bg-slate-900 p-4">
            <MediaViewer id={tile.id} title={tile.title} />
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 rounded bg-brand-copper px-3 py-1 text-white"
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
