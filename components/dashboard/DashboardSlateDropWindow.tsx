"use client";

import { useState, useRef, useEffect } from "react";
import { FolderOpen, X } from "lucide-react";
import SlateDropClient from "@/components/slatedrop/SlateDropClient";
import type { Tier } from "@/lib/entitlements";

/* ================================================================
   TYPES
   ================================================================ */

interface DashboardSlateDropWindowProps {
  open: boolean;
  onClose: () => void;
  user: { name: string; email: string };
  tier: Tier;
}

/* ================================================================
   COMPONENT — macOS-style floating SlateDrop window
   ================================================================ */

export default function DashboardSlateDropWindow({
  open,
  onClose,
  user,
  tier,
}: DashboardSlateDropWindowProps) {
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 1000, h: 680 });
  const [isMobile, setIsMobile] = useState(false);

  const dragMode = useRef<"title" | "resize" | null>(null);
  const dragStart = useRef({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
    startW: 0,
    startH: 0,
  });

  /* Reset window geometry when opened */
  useEffect(() => {
    if (!open) return;
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (mobile) {
      setPos({ x: 0, y: 0 });
      setSize({ w: window.innerWidth, h: window.innerHeight });
    } else {
      setPos({
        x: Math.max(0, (window.innerWidth - 1000) / 2),
        y: Math.max(10, (window.innerHeight - 680) / 4),
      });
      setSize({ w: 1000, h: 680 });
    }
    setMinimized(false);
  }, [open]);

  /* ── Drag handlers ── */
  function onTitleDown(e: React.PointerEvent) {
    dragMode.current = "title";
    dragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: pos.x,
      startY: pos.y,
      startW: size.w,
      startH: size.h,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onResizeDown(e: React.PointerEvent) {
    dragMode.current = "resize";
    dragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: pos.x,
      startY: pos.y,
      startW: size.w,
      startH: size.h,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragMode.current) return;
    const dx = e.clientX - dragStart.current.clientX;
    const dy = e.clientY - dragStart.current.clientY;
    if (dragMode.current === "title") {
      setPos({
        x: dragStart.current.startX + dx,
        y: dragStart.current.startY + dy,
      });
    } else {
      setSize({
        w: Math.max(560, dragStart.current.startW + dx),
        h: Math.max(420, dragStart.current.startH + dy),
      });
    }
  }
  function onPointerUp() {
    dragMode.current = null;
  }

  if (!open) return null;

  return (
    <div
      className={`fixed z-[9999] flex flex-col overflow-hidden shadow-[0_32px_80px_-12px_rgba(0,0,0,0.55)] ${isMobile ? "rounded-none border-0" : "rounded-2xl border border-zinc-700/70"}`}
      style={{
        left: isMobile ? 0 : pos.x,
        top: isMobile ? 0 : pos.y,
        width: isMobile ? "100vw" : size.w,
        height: minimized ? "auto" : isMobile ? "100dvh" : size.h,
      }}
    >
      {/* ── Title bar / drag handle ── */}
      <div
        className={`flex items-center gap-3 px-4 h-11 bg-zinc-900 select-none shrink-0 ${isMobile ? "" : "cursor-grab active:cursor-grabbing"}`}
        onPointerDown={isMobile ? undefined : onTitleDown}
        onPointerMove={isMobile ? undefined : onPointerMove}
        onPointerUp={isMobile ? undefined : onPointerUp}
      >
        {/* Traffic-light buttons */}
        <div
          className="flex items-center gap-1.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center group transition-colors"
            title="Close"
          >
            <X
              size={7}
              className="text-red-900 opacity-0 group-hover:opacity-100"
            />
          </button>
          <button
            onClick={() => setMinimized((v) => !v)}
            className="w-3.5 h-3.5 rounded-full bg-yellow-400 hover:bg-yellow-300 transition-colors"
            title={minimized ? "Restore" : "Minimise"}
          />
          {!isMobile && (
            <button
              onClick={() => {
                setSize({
                  w: window.innerWidth - 32,
                  h: window.innerHeight - 32,
                });
                setPos({ x: 16, y: 16 });
                setMinimized(false);
              }}
              className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
              title="Maximise"
            />
          )}
        </div>
        <FolderOpen size={14} className="text-[#F59E0B] ml-1 shrink-0" />
        <span className="text-[13px] font-semibold text-white/90 flex-1 text-center -ml-8 pointer-events-none">
          SlateDrop
        </span>
      </div>

      {/* ── Embedded SlateDropClient ── */}
      {!minimized && (
        <div className="flex-1 overflow-hidden">
          <SlateDropClient user={user} tier={tier} embedded />
        </div>
      )}

      {/* ── Resize handle (bottom-right corner) ── */}
      {!minimized && !isMobile && (
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize"
          style={{
            background:
              "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.18) 50%)",
          }}
          onPointerDown={onResizeDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      )}
    </div>
  );
}
