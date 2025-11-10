"use client";
import { useState } from "react";
import MediaViewer from "./MediaViewer";
import { Tile } from "@/lib/types";

export default function MobileViewerLauncher({ tile }: { tile: Tile }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 flex flex-col items-center">
      <button
        onClick={() => setOpen(true)}
        className="w-32 h-24 bg-slate-800 rounded-lg shadow-md flex items-center justify-center"
      >
        <span className="text-slate-400 text-sm">Open Viewer</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-90p h-70p bg-slate-900 rounded-xl p-2 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <MediaViewer id={tile.id} title={tile.title} />
          </div>
        </div>
      )}
    </div>
  );
}
