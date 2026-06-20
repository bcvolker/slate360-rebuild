"use client";

import { create } from "zustand";

/**
 * Transient Content Studio editor state. Kept in Zustand (not React Context) so
 * panels subscribe only to the slices they need — no prop-drilling, no re-render
 * cascades across the dockview shell. Persisted layout/spec live separately
 * (ui_state_json / timeline_json); this store is in-memory session state.
 */

export type EditorMode = "video" | "360" | "photo";
export type InspectorTab = "clip" | "color" | "audio" | "titles" | "enhance" | "export";

export type PanelId = "mediaBin" | "inspector";

type EditorState = {
  mode: EditorMode;
  inspectorTab: InspectorTab;
  panelVisibility: Record<PanelId, boolean>;
  playheadSec: number;

  setMode: (mode: EditorMode) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  togglePanel: (id: PanelId) => void;
  setPlayhead: (sec: number) => void;
  resetLayout: () => void;
};

const DEFAULT_PANEL_VISIBILITY: Record<PanelId, boolean> = {
  mediaBin: true,
  inspector: true,
};

export const useEditorStore = create<EditorState>((set) => ({
  mode: "video",
  inspectorTab: "clip",
  panelVisibility: { ...DEFAULT_PANEL_VISIBILITY },
  playheadSec: 0,

  setMode: (mode) => set({ mode }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  togglePanel: (id) =>
    set((s) => ({
      panelVisibility: { ...s.panelVisibility, [id]: !s.panelVisibility[id] },
    })),
  setPlayhead: (playheadSec) => set({ playheadSec }),
  resetLayout: () =>
    set({ panelVisibility: { ...DEFAULT_PANEL_VISIBILITY }, inspectorTab: "clip" }),
}));
