"use client";

import { Maximize2, X } from "lucide-react";

export function ViewerCard({
  children,
  onInteract,
  onExpand,
  interacted,
}: {
  children: React.ReactNode;
  onInteract: () => void;
  onExpand: () => void;
  interacted: boolean;
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-lg flex flex-col">
      <div className="relative w-full aspect-[4/3] sm:aspect-video bg-gray-100 overflow-hidden">
        {children}
        <button
          onClick={onExpand}
          className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/90 hover:bg-white text-gray-700 border border-gray-200 shadow-sm transition-all hover:shadow backdrop-blur-sm z-10"
        >
          <Maximize2 size={11} /> Expand
        </button>
      </div>
      <div className="px-4 py-3 flex items-center justify-end bg-white">
        <button
          onClick={onInteract}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white transition-all hover:opacity-90 hover:scale-105"
          style={{ backgroundColor: "#FF4D00" }}
        >
          {interacted ? "Reset" : "Interact"}
        </button>
      </div>
    </div>
  );
}

export function ViewerModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col w-[90vw] h-[90vh] sm:w-[65vw] sm:h-[65vh] max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 relative min-h-0">{children}</div>
      </div>
    </div>
  );
}
