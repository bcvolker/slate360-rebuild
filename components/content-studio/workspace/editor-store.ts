"use client";

import { create } from "zustand";
import { useStore } from "zustand";
import { temporal } from "zundo";

/**
 * Transient Content Studio editor state (Zustand — panels subscribe to slices,
 * no prop-drilling). Holds the timeline clip model + playback transport that the
 * Preview compositor and Timeline both read. Persisted spec/layout live elsewhere.
 */

export type EditorMode = "video" | "360" | "photo";
export type InspectorTab = "clip" | "color" | "audio" | "titles" | "enhance" | "export";
export type PanelId = "mediaBin" | "inspector";

/** A clip instance placed on the timeline (laid out sequentially in V1). */
export type TimelineClip = {
  id: string; // unique timeline instance id
  assetId: string;
  name: string;
  src: string; // signed proxy (or original) URL for preview
  durationSec: number; // source duration; 0 until <video> metadata loads
  trimInSec: number;
  trimOutSec: number; // exclusive; clip length = trimOut - trimIn
};

export type ClipLayout = { clip: TimelineClip; startSec: number; lengthSec: number };

type EditorState = {
  mode: EditorMode;
  inspectorTab: InspectorTab;
  panelVisibility: Record<PanelId, boolean>;

  // timeline + transport
  clips: TimelineClip[];
  selectedClipId: string | null;
  playheadSec: number;
  playing: boolean;
  pxPerSec: number;
  snap: boolean;

  setMode: (mode: EditorMode) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  togglePanel: (id: PanelId) => void;
  resetLayout: () => void;

  addClip: (c: { assetId: string; name: string; src: string; durationSec?: number }) => void;
  removeClip: (id: string) => void;
  selectClip: (id: string | null) => void;
  patchClipDuration: (id: string, durationSec: number) => void;
  splitAtPlayhead: () => void;
  setClipTrim: (id: string, edit: { trimInSec?: number; trimOutSec?: number }) => void;
  toggleSnap: () => void;

  setPlayhead: (sec: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setZoom: (pxPerSec: number) => void;
};

const DEFAULT_PANELS: Record<PanelId, boolean> = { mediaBin: true, inspector: true };

function uid(): string {
  return `clip_${Math.random().toString(36).slice(2, 10)}`;
}

/** Sequential layout: each clip starts where the previous ended. */
export function layoutClips(clips: TimelineClip[]): { rows: ClipLayout[]; total: number } {
  let cursor = 0;
  const rows = clips.map((clip) => {
    const lengthSec = Math.max(0, (clip.trimOutSec || clip.durationSec) - clip.trimInSec) || clip.durationSec || 0;
    const row = { clip, startSec: cursor, lengthSec };
    cursor += lengthSec;
    return row;
  });
  return { rows, total: cursor };
}

/** Active clip + local source time at a given timeline position. */
export function clipAt(clips: TimelineClip[], playheadSec: number): { row: ClipLayout; localSec: number } | null {
  const { rows } = layoutClips(clips);
  for (const row of rows) {
    if (playheadSec >= row.startSec && playheadSec < row.startSec + row.lengthSec) {
      return { row, localSec: row.clip.trimInSec + (playheadSec - row.startSec) };
    }
  }
  const last = rows[rows.length - 1];
  if (last && playheadSec >= last.startSec + last.lengthSec && last.lengthSec > 0) {
    return { row: last, localSec: last.clip.trimInSec + last.lengthSec };
  }
  return null;
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
  mode: "video",
  inspectorTab: "clip",
  panelVisibility: { ...DEFAULT_PANELS },

  clips: [],
  selectedClipId: null,
  playheadSec: 0,
  playing: false,
  pxPerSec: 60,
  snap: true,

  setMode: (mode) => set({ mode }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  togglePanel: (id) => set((s) => ({ panelVisibility: { ...s.panelVisibility, [id]: !s.panelVisibility[id] } })),
  resetLayout: () => set({ panelVisibility: { ...DEFAULT_PANELS }, inspectorTab: "clip" }),

  addClip: (c) =>
    set((s) => {
      const d = c.durationSec && c.durationSec > 0 ? c.durationSec : 0;
      const clip: TimelineClip = {
        id: uid(),
        assetId: c.assetId,
        name: c.name,
        src: c.src,
        durationSec: d,
        trimInSec: 0,
        trimOutSec: d,
      };
      return { clips: [...s.clips, clip], selectedClipId: clip.id };
    }),
  removeClip: (id) =>
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== id),
      selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
    })),
  selectClip: (selectedClipId) => set({ selectedClipId }),
  patchClipDuration: (id, durationSec) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === id ? { ...c, durationSec, trimOutSec: c.trimOutSec > 0 ? c.trimOutSec : durationSec } : c,
      ),
    })),
  splitAtPlayhead: () =>
    set((s) => {
      const hit = clipAt(s.clips, s.playheadSec);
      if (!hit) return {};
      const { row, localSec } = hit;
      const src = row.clip;
      // Need a real interior cut: not at either edge.
      if (localSec <= src.trimInSec + 0.04 || localSec >= src.trimOutSec - 0.04) return {};
      const left: TimelineClip = { ...src, trimOutSec: localSec };
      const right: TimelineClip = { ...src, id: uid(), trimInSec: localSec };
      const idx = s.clips.findIndex((c) => c.id === src.id);
      const next = [...s.clips];
      next.splice(idx, 1, left, right);
      return { clips: next, selectedClipId: right.id };
    }),
  setClipTrim: (id, edit) =>
    set((s) => ({
      clips: s.clips.map((c) => {
        if (c.id !== id) return c;
        const dur = c.durationSec || c.trimOutSec || 0;
        let trimIn = edit.trimInSec ?? c.trimInSec;
        let trimOut = edit.trimOutSec ?? c.trimOutSec;
        trimIn = Math.max(0, Math.min(trimIn, trimOut - 0.1));
        trimOut = Math.min(dur || trimOut, Math.max(trimOut, trimIn + 0.1));
        return { ...c, trimInSec: trimIn, trimOutSec: trimOut };
      }),
    })),
  toggleSnap: () => set((s) => ({ snap: !s.snap })),

  setPlayhead: (playheadSec) => set({ playheadSec: Math.max(0, playheadSec) }),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setZoom: (pxPerSec) => set({ pxPerSec: Math.max(8, Math.min(240, pxPerSec)) }),
    }),
    {
      // History tracks ONLY the clip array — transport/zoom/panel changes never
      // pollute undo. Selection rides along so undo restores the active clip.
      partialize: (s) => ({ clips: s.clips, selectedClipId: s.selectedClipId }),
      limit: 100,
      equality: (a, b) => a.clips === b.clips,
    },
  ),
);

/** Reactive undo/redo bindings for the command bar (subscribes to history depth). */
export function useUndoRedo() {
  const { undo, redo } = useEditorStore.temporal.getState();
  const canUndo = useStore(useEditorStore.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(useEditorStore.temporal, (s) => s.futureStates.length > 0);
  return { undo: () => undo(), redo: () => redo(), canUndo, canRedo };
}

// Dev-only handle for harness/manual testing (absent in production builds).
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __csStore?: unknown }).__csStore = useEditorStore;
}
