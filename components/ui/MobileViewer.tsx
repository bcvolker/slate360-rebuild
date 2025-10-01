'use client';
import { useState } from "react";
import { Dialog } from "@headlessui/react";
import MediaViewer from "./MediaViewer";

export default function MobileViewer({ tile }: { tile: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Small viewer preview */}
      <div className="mx-auto mt-4 w-1/4 h-24 rounded bg-slate-800" onClick={() => setIsOpen(true)}>
        <MediaViewer tile={tile} />
      </div>

      {/* Fullscreen modal */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-[90%] h-[70%] rounded bg-slate-900 p-4">
            <MediaViewer tile={tile} />
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
