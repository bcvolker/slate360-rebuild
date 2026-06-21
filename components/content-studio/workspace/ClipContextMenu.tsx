"use client";

import { useEffect } from "react";
import { AudioLines, Copy, RotateCw, Scissors, Trash2 } from "lucide-react";
import { useEditorStore } from "./editor-store";

/**
 * Right-click clip menu — the verb surface for a clip. Functional items only
 * (split / duplicate / reverse / delete); detach-audio, transitions, and apply-look
 * join here as those subsystems land. Positioned at the cursor, clamped to viewport.
 */
export function ClipContextMenu({
  clipId,
  x,
  y,
  onClose,
}: {
  clipId: string;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const clip = useEditorStore((s) => s.clips.find((c) => c.id === clipId) ?? null);
  const splitAtPlayhead = useEditorStore((s) => s.splitAtPlayhead);
  const duplicateClip = useEditorStore((s) => s.duplicateClip);
  const toggleReverse = useEditorStore((s) => s.toggleReverse);
  const detachAudio = useEditorStore((s) => s.detachAudio);
  const removeClip = useEditorStore((s) => s.removeClip);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!clip) return null;

  const run = (fn: () => void) => () => { fn(); onClose(); };
  // Clamp so the menu never overflows the viewport.
  const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 200);
  const top = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 200);

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ left, top }}
        className="absolute w-48 overflow-hidden rounded-md border border-white/10 bg-[#0B0F15] py-1 shadow-2xl"
      >
        <div className="truncate px-3 py-1 text-[10px] uppercase tracking-wider text-white/35">{clip.name}</div>
        <Item icon={<Scissors className="h-3.5 w-3.5" />} label="Split at playhead" onClick={run(splitAtPlayhead)} />
        <Item icon={<Copy className="h-3.5 w-3.5" />} label="Duplicate" onClick={run(() => duplicateClip(clip.id))} />
        <Item
          icon={<RotateCw className="h-3.5 w-3.5" />}
          label={clip.reversed ? "Reverse · on" : "Reverse"}
          active={clip.reversed}
          onClick={run(() => toggleReverse(clip.id))}
        />
        <Item
          icon={<AudioLines className="h-3.5 w-3.5" />}
          label={clip.muted ? "Audio detached" : "Detach audio"}
          active={clip.muted}
          onClick={run(() => detachAudio(clip.id))}
        />
        <div className="my-1 border-t border-white/10" />
        <Item icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" danger onClick={run(() => removeClip(clip.id))} />
      </div>
    </div>
  );
}

function Item({
  icon,
  label,
  onClick,
  active,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/5 ${
        danger ? "text-red-300/80" : active ? "text-[#3D8EFF]" : "text-white/80"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
