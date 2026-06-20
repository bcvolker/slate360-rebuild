"use client";

import { create } from "zustand";

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

  setMode: (mode: EditorMode) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  togglePanel: (id: PanelId) => void;
  resetLayout: () => void;

  addClip: (c: { assetId: string; name: string; src: string; durationSec?: number }) => void;
  removeClip: (id: string) => void;
  selectClip: (id: string | null) => void;
  patchClipDuration: (id: string, durationSec: number) => void;

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

export const useEditorStore = create<EditorState>((set) => ({
  mode: "video",
  inspectorTab: "clip",
  panelVisibility: { ...DEFAULT_PANELS },

  clips: [],
  selectedClipId: null,
  playheadSec: 0,
  playing: false,
  pxPerSec: 60,

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

  setPlayhead: (playheadSec) => set({ playheadSec: Math.max(0, playheadSec) }),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setZoom: (pxPerSec) => set({ pxPerSec: Math.max(8, Math.min(240, pxPerSec)) }),
}));

// Dev-only handle for harness/manual testing (absent in production builds).
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __csStore?: unknown }).__csStore = useEditorStore;
}
