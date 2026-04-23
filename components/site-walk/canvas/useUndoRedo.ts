/**
 * components/site-walk/canvas/useUndoRedo.ts
 *
 * Generic local undo/redo engine for the Site Walk canvas (and any other
 * editor surface). Holds an immutable history stack of `<T>` snapshots.
 *
 * Typical use with MarkupData:
 *   const history = useUndoRedo<MarkupData>(EMPTY_MARKUP);
 *   // user draws a rectangle:
 *   history.commitState({ ...history.state, shapes: [...history.state.shapes, rect] });
 *   // ⌘Z:
 *   if (history.canUndo) history.undo();
 *
 * Notes:
 *  - Snapshots are stored by reference (NOT deep cloned). The caller is
 *    expected to pass a NEW object on every commit (immutable updates).
 *  - History is capped at `maxHistory` (default 100) to bound memory.
 *  - `commitState` truncates any pending redo branch (standard editor UX).
 */
"use client";

import { useCallback, useMemo, useRef, useState } from "react";

const DEFAULT_MAX_HISTORY = 100;

export interface UndoRedoApi<T> {
  state: T;
  canUndo: boolean;
  canRedo: boolean;
  /** Push a new snapshot. Clears any redo branch. */
  commitState: (next: T) => void;
  /** Replace the current snapshot in place WITHOUT pushing history. */
  replaceState: (next: T) => void;
  undo: () => void;
  redo: () => void;
  /** Discard all history and reset to a fresh initial state. */
  reset: (next?: T) => void;
}

export interface UseUndoRedoOptions {
  /** Maximum snapshots retained (oldest dropped first). Default 100. */
  maxHistory?: number;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {},
): UndoRedoApi<T> {
  const maxHistory = options.maxHistory ?? DEFAULT_MAX_HISTORY;

  // Past stack: oldest → most recent committed BEFORE current.
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  // Future stack: most recent undone → oldest undone.
  const [future, setFuture] = useState<T[]>([]);

  // Hold the latest values in refs so the callbacks can be stable
  // (no re-creation on every snapshot push).
  const pastRef = useRef(past);
  const presentRef = useRef(present);
  const futureRef = useRef(future);
  pastRef.current = past;
  presentRef.current = present;
  futureRef.current = future;

  const commitState = useCallback(
    (next: T) => {
      if (Object.is(next, presentRef.current)) return;
      const nextPast = [...pastRef.current, presentRef.current];
      const trimmed =
        nextPast.length > maxHistory
          ? nextPast.slice(nextPast.length - maxHistory)
          : nextPast;
      setPast(trimmed);
      setPresent(next);
      setFuture([]);
    },
    [maxHistory],
  );

  const replaceState = useCallback((next: T) => {
    setPresent(next);
  }, []);

  const undo = useCallback(() => {
    const p = pastRef.current;
    if (p.length === 0) return;
    const previous = p[p.length - 1] as T;
    setPast(p.slice(0, -1));
    setFuture([presentRef.current, ...futureRef.current]);
    setPresent(previous);
  }, []);

  const redo = useCallback(() => {
    const f = futureRef.current;
    if (f.length === 0) return;
    const next = f[0] as T;
    setFuture(f.slice(1));
    setPast([...pastRef.current, presentRef.current]);
    setPresent(next);
  }, []);

  const reset = useCallback(
    (next?: T) => {
      setPast([]);
      setFuture([]);
      if (next !== undefined) setPresent(next);
    },
    [],
  );

  return useMemo<UndoRedoApi<T>>(
    () => ({
      state: present,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      commitState,
      replaceState,
      undo,
      redo,
      reset,
    }),
    [present, past.length, future.length, commitState, replaceState, undo, redo, reset],
  );
}
