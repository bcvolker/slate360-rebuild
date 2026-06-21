"use client";

import { create } from "zustand";
import { useStore } from "zustand";
import { temporal } from "zundo";
import { NEUTRAL_COLOR, type ColorAdjust } from "@/lib/content-studio/color";

/**
 * Transient Content Studio editor state (Zustand — panels subscribe to slices,
 * no prop-drilling). Holds the timeline clip model + playback transport that the
 * Preview compositor and Timeline both read. Persisted spec/layout live elsewhere.
 */

export type EditorMode = "video" | "360" | "photo";
export type InspectorTab = "clip" | "color" | "audio" | "titles" | "enhance" | "export";
export type PanelId = "mediaBin" | "inspector";
export type MediaBinTab = "project" | "library";

export type PendingTransition = {
  xfade: string;
  durationSec: number;
  name: string;
};

/** A clip instance placed on the timeline (laid out sequentially in V1). */
export type TimelineClip = {
  id: string; // unique timeline instance id
  assetId: string;
  name: string;
  src: string; // signed proxy (or original) URL for preview
  durationSec: number; // source duration; 0 until <video> metadata loads
  trimInSec: number;
  trimOutSec: number; // exclusive; source span = trimOut - trimIn
  speedFactor: number; // 0.25–4×; timeline length = source span / speedFactor
  reversed: boolean;
  muted?: boolean; // embedded audio muted (e.g. after detach)
};

export type ClipLayout = { clip: TimelineClip; startSec: number; lengthSec: number };

export type OverlayLane = "audio" | "title";

export type TitleStyle = {
  fontSize: number; // px on the preview canvas
  color: string;
  background: boolean;
  bgColor: string;
  position: "top" | "center" | "bottom";
  align: "left" | "center" | "right";
};

export const DEFAULT_TITLE_STYLE: TitleStyle = {
  fontSize: 36,
  color: "#ffffff",
  background: true,
  bgColor: "rgba(0,0,0,0.55)",
  position: "bottom",
  align: "center",
};

/** A free-floating timeline element on an overlay lane (music/SFX/title/caption),
 *  absolutely positioned (its own startSec) — independent of the video clips. */
export type OverlayItem = {
  id: string;
  lane: OverlayLane;
  kind: string; // music | sfx | title | caption
  name: string;
  startSec: number;
  durationSec: number;
  libraryId?: string;
  assetId?: string; // source media asset (for re-resolving src after reload)
  text?: string;
  storageKey?: string;
  src?: string; // signed proxy URL for audio playback
  audioGain?: number; // 0–1 (preview volume); default 1
  fadeInSec?: number;
  fadeOutSec?: number;
  titleStyle?: TitleStyle;
};

type EditorState = {
  mode: EditorMode;
  inspectorTab: InspectorTab;
  panelVisibility: Record<PanelId, boolean>;
  mediaBinTab: MediaBinTab;
  libraryCategory: string | null;
  activeLookId: string | null;
  activeLookName: string | null;
  /** Master grade — applies to EVERY clip (the adjustment-layer / apply-to-all). */
  masterColor: ColorAdjust;
  /** Per-clip overrides — when present, replace master for that clip. */
  clipColor: Record<string, ColorAdjust>;
  /** Whether the Color tab edits all clips (master) or just the selected clip. */
  colorScope: "all" | "clip";
  pendingTransition: PendingTransition | null;
  libraryToast: string | null;

  // project + timeline + transport
  editProjectId: string | null;
  clips: TimelineClip[];
  overlayItems: OverlayItem[];
  selectedOverlayId: string | null;
  selectedClipId: string | null;
  playheadSec: number;
  playing: boolean;
  pxPerSec: number;
  snap: boolean;

  setMode: (mode: EditorMode) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setMediaBinTab: (tab: MediaBinTab) => void;
  setLibraryCategory: (category: string | null) => void;
  applyLibraryLook: (look: { id: string; name: string; lookJson?: Record<string, unknown> }) => void;
  setColorScope: (scope: "all" | "clip") => void;
  setColor: (patch: Partial<ColorAdjust>) => void;
  resetColor: () => void;
  setPendingTransition: (t: PendingTransition | null) => void;
  setLibraryToast: (msg: string | null) => void;
  togglePanel: (id: PanelId) => void;
  resetLayout: () => void;

  setEditProjectId: (id: string | null) => void;
  loadClips: (clips: TimelineClip[]) => void;
  setOverlayItems: (items: OverlayItem[]) => void;
  addOverlayItem: (item: Omit<OverlayItem, "id">) => void;
  addTitle: () => void;
  updateOverlayItem: (id: string, patch: Partial<Omit<OverlayItem, "id" | "titleStyle">> & { titleStyle?: Partial<TitleStyle> }) => void;
  moveOverlayItem: (id: string, startSec: number) => void;
  removeOverlayItem: (id: string) => void;
  selectOverlay: (id: string | null) => void;
  addClip: (c: { assetId: string; name: string; src: string; durationSec?: number }) => void;
  removeClip: (id: string) => void;
  selectClip: (id: string | null) => void;
  patchClipDuration: (id: string, durationSec: number) => void;
  splitAtPlayhead: () => void;
  duplicateClip: (id: string) => void;
  detachAudio: (clipId: string) => void;
  setClipTrim: (id: string, edit: { trimInSec?: number; trimOutSec?: number }) => void;
  setClipSpeed: (id: string, speedFactor: number) => void;
  toggleReverse: (id: string) => void;
  moveClipTo: (id: string, index: number) => void;
  commitClips: () => void;
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

/** Sequential layout: each clip starts where the previous ended (speed-aware). */
export function layoutClips(clips: TimelineClip[]): { rows: ClipLayout[]; total: number } {
  let cursor = 0;
  const rows = clips.map((clip) => {
    const srcSpan = Math.max(0, (clip.trimOutSec || clip.durationSec) - clip.trimInSec) || clip.durationSec || 0;
    const lengthSec = srcSpan / (clip.speedFactor || 1);
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
      const sp = row.clip.speedFactor || 1;
      return { row, localSec: row.clip.trimInSec + (playheadSec - row.startSec) * sp };
    }
  }
  const last = rows[rows.length - 1];
  if (last && playheadSec >= last.startSec + last.lengthSec && last.lengthSec > 0) {
    return { row: last, localSec: last.clip.trimInSec + last.lengthSec * (last.clip.speedFactor || 1) };
  }
  return null;
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
  mode: "video",
  inspectorTab: "clip",
  panelVisibility: { ...DEFAULT_PANELS },
  mediaBinTab: "project",
  libraryCategory: null,
  activeLookId: null,
  activeLookName: null,
  masterColor: { ...NEUTRAL_COLOR },
  clipColor: {},
  colorScope: "all",
  pendingTransition: null,
  libraryToast: null,

  editProjectId: null,
  clips: [],
  overlayItems: [],
  selectedOverlayId: null,
  selectedClipId: null,
  playheadSec: 0,
  playing: false,
  pxPerSec: 60,
  snap: true,

  setMode: (mode) => set({ mode }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  setMediaBinTab: (mediaBinTab) => set({ mediaBinTab }),
  setLibraryCategory: (libraryCategory) => set({ libraryCategory, mediaBinTab: "library" }),
  applyLibraryLook: (look) =>
    set(() => {
      const g = look.lookJson ?? {};
      const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      // lookJson is 1-centered multipliers (contrast/saturation) + small exposure +
      // ~Kelvin temperature; map into the 0-centered [-100,100] adjustment model.
      const master: ColorAdjust = {
        exposure: cl(Number(g.exposure ?? 0) * 200, -100, 100),
        contrast: cl((Number(g.contrast ?? 1) - 1) * 100, -100, 100),
        saturation: cl((Number(g.saturation ?? 1) - 1) * 100, -100, 100),
        temperature: cl(Number(g.temperature ?? 0) / 6, -100, 100),
      };
      // Apply the look to ALL clips: set master, clear per-clip overrides.
      return {
        activeLookId: look.id,
        activeLookName: look.name,
        inspectorTab: "color",
        colorScope: "all",
        masterColor: master,
        clipColor: {},
        libraryToast: `Applied look "${look.name}" to all clips`,
      };
    }),
  setColorScope: (colorScope) => set({ colorScope }),
  setColor: (patch) =>
    set((s) => {
      if (s.colorScope === "clip" && s.selectedClipId) {
        const base = s.clipColor[s.selectedClipId] ?? s.masterColor;
        return { clipColor: { ...s.clipColor, [s.selectedClipId]: { ...base, ...patch } }, activeLookId: null, activeLookName: null };
      }
      // "all" scope: edit the master grade; clear per-clip overrides so it truly applies to all.
      return { masterColor: { ...s.masterColor, ...patch }, clipColor: {}, activeLookId: null, activeLookName: null };
    }),
  resetColor: () =>
    set((s) => {
      if (s.colorScope === "clip" && s.selectedClipId) {
        const next = { ...s.clipColor };
        delete next[s.selectedClipId];
        return { clipColor: next };
      }
      return { masterColor: { ...NEUTRAL_COLOR }, clipColor: {}, activeLookId: null, activeLookName: null };
    }),
  setPendingTransition: (pendingTransition) =>
    set({ pendingTransition, libraryToast: pendingTransition ? `Default transition: ${pendingTransition.name}` : null }),
  setLibraryToast: (libraryToast) => set({ libraryToast }),
  togglePanel: (id) => set((s) => ({ panelVisibility: { ...s.panelVisibility, [id]: !s.panelVisibility[id] } })),
  resetLayout: () => set({ panelVisibility: { ...DEFAULT_PANELS }, inspectorTab: "clip" }),

  setEditProjectId: (editProjectId) => set({ editProjectId }),
  loadClips: (clips) => set({ clips, selectedClipId: null, playheadSec: 0, playing: false }),
  setOverlayItems: (overlayItems) => set({ overlayItems }),
  addOverlayItem: (item) =>
    set((s) => {
      const it: OverlayItem = { ...item, id: `ov_${Math.random().toString(36).slice(2, 10)}`, startSec: Math.max(0, item.startSec) };
      return { overlayItems: [...s.overlayItems, it], selectedOverlayId: it.id, selectedClipId: null, inspectorTab: it.lane === "title" ? "titles" : "audio" };
    }),
  addTitle: () =>
    set((s) => {
      const it: OverlayItem = {
        id: `ov_${Math.random().toString(36).slice(2, 10)}`,
        lane: "title",
        kind: "title",
        name: "Title",
        text: "New title",
        startSec: Math.max(0, s.playheadSec),
        durationSec: 4,
        titleStyle: { ...DEFAULT_TITLE_STYLE },
      };
      return { overlayItems: [...s.overlayItems, it], selectedOverlayId: it.id, selectedClipId: null, inspectorTab: "titles" };
    }),
  updateOverlayItem: (id, patch) =>
    set((s) => ({
      overlayItems: s.overlayItems.map((o) =>
        o.id === id
          ? { ...o, ...patch, titleStyle: patch.titleStyle ? { ...(o.titleStyle ?? DEFAULT_TITLE_STYLE), ...patch.titleStyle } : o.titleStyle }
          : o,
      ),
    })),
  moveOverlayItem: (id, startSec) =>
    set((s) => ({ overlayItems: s.overlayItems.map((o) => (o.id === id ? { ...o, startSec: Math.max(0, startSec) } : o)) })),
  removeOverlayItem: (id) =>
    set((s) => ({ overlayItems: s.overlayItems.filter((o) => o.id !== id), selectedOverlayId: s.selectedOverlayId === id ? null : s.selectedOverlayId })),
  selectOverlay: (selectedOverlayId) =>
    set((s) => {
      const it = s.overlayItems.find((o) => o.id === selectedOverlayId);
      return { selectedOverlayId, selectedClipId: null, inspectorTab: it ? (it.lane === "title" ? "titles" : "audio") : s.inspectorTab };
    }),
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
        speedFactor: 1,
        reversed: false,
      };
      return { clips: [...s.clips, clip], selectedClipId: clip.id, inspectorTab: "clip" };
    }),
  removeClip: (id) =>
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== id),
      selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
    })),
  selectClip: (selectedClipId) =>
    set((s) => (selectedClipId ? { selectedClipId, inspectorTab: "clip" } : { selectedClipId, inspectorTab: s.inspectorTab })),
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
  duplicateClip: (id) =>
    set((s) => {
      const i = s.clips.findIndex((c) => c.id === id);
      if (i < 0) return {};
      const copy: TimelineClip = { ...s.clips[i], id: uid() };
      const next = [...s.clips];
      next.splice(i + 1, 0, copy);
      return { clips: next, selectedClipId: copy.id };
    }),
  detachAudio: (clipId) =>
    set((s) => {
      const { rows } = layoutClips(s.clips);
      const row = rows.find((r) => r.clip.id === clipId);
      if (!row || row.clip.muted) return {};
      const c = row.clip;
      const it: OverlayItem = {
        id: `ov_${Math.random().toString(36).slice(2, 10)}`,
        lane: "audio",
        kind: "source",
        name: `${c.name} audio`,
        assetId: c.assetId,
        src: c.src,
        startSec: row.startSec,
        durationSec: row.lengthSec,
        audioGain: 1,
        fadeInSec: 0,
        fadeOutSec: 0,
      };
      return {
        overlayItems: [...s.overlayItems, it],
        clips: s.clips.map((x) => (x.id === clipId ? { ...x, muted: true } : x)),
        selectedOverlayId: it.id,
        selectedClipId: null,
        inspectorTab: "audio",
      };
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
  setClipSpeed: (id, speedFactor) =>
    set((s) => ({
      clips: s.clips.map((c) => (c.id === id ? { ...c, speedFactor: Math.max(0.25, Math.min(4, speedFactor)) } : c)),
    })),
  toggleReverse: (id) =>
    set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, reversed: !c.reversed } : c)) })),
  moveClipTo: (id, index) =>
    set((s) => {
      const from = s.clips.findIndex((c) => c.id === id);
      if (from < 0) return {};
      const arr = [...s.clips];
      const [it] = arr.splice(from, 1);
      arr.splice(Math.max(0, Math.min(index, arr.length)), 0, it);
      return { clips: arr };
    }),
  // Force a single history snapshot (used to commit a drag-reorder as one undo step).
  commitClips: () => set((s) => ({ clips: [...s.clips] })),
  toggleSnap: () => set((s) => ({ snap: !s.snap })),

  setPlayhead: (playheadSec) => set({ playheadSec: Math.max(0, playheadSec) }),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setZoom: (pxPerSec) => set({ pxPerSec: Math.max(8, Math.min(240, pxPerSec)) }),
    }),
    {
      // History tracks the clips + overlay items — transport/zoom/panel changes
      // never pollute undo. Selection rides along so undo restores the active clip.
      partialize: (s) => ({ clips: s.clips, overlayItems: s.overlayItems, selectedClipId: s.selectedClipId }),
      limit: 100,
      equality: (a, b) => a.clips === b.clips && a.overlayItems === b.overlayItems,
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
