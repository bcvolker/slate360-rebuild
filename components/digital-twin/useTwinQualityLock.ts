"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  QUALITY_LOCK_ALL_ON,
  QUALITY_LOCK_CONTROLS,
  QUALITY_LOCK_NONE_SUPPORTED,
  applyQualityLock,
  detectQualityLockSupport,
  isAnyQualityLockSupported,
  type QualityLockControlId,
  type QualityLockState,
  type QualityLockSupport,
} from "@/lib/digital-twin/twin-capture-quality-lock";

type Args = {
  getActiveStream: () => MediaStream | null;
  streamReady: boolean;
  /** Only meaningful in photo mode — video recording manages its own pipeline. */
  active: boolean;
};

/**
 * Owns the Quality Lock state for the twin photo capture: detects what the device
 * can lock, locks everything by default when the stream comes up, and lets the
 * user toggle any single control back to auto. Best-effort by design.
 */
export function useTwinQualityLock({ getActiveStream, streamReady, active }: Args) {
  const [support, setSupport] = useState<QualityLockSupport>(QUALITY_LOCK_NONE_SUPPORTED);
  const [locks, setLocks] = useState<QualityLockState>(QUALITY_LOCK_ALL_ON);
  const locksRef = useRef(locks);
  locksRef.current = locks;

  // When the stream becomes ready in photo mode, detect support and apply the
  // default locks against the current (auto) values.
  useEffect(() => {
    if (!streamReady || !active) return;
    const stream = getActiveStream();
    const track = stream?.getVideoTracks()[0] ?? null;
    const nextSupport = detectQualityLockSupport(track);
    setSupport(nextSupport);
    if (isAnyQualityLockSupported(nextSupport)) {
      void applyQualityLock(stream, nextSupport, locksRef.current);
    }
  }, [active, getActiveStream, streamReady]);

  const toggle = useCallback(
    (id: QualityLockControlId) => {
      setLocks((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        void applyQualityLock(getActiveStream(), support, next);
        return next;
      });
    },
    [getActiveStream, support],
  );

  const relock = useCallback(() => {
    setLocks(QUALITY_LOCK_ALL_ON);
    void applyQualityLock(getActiveStream(), support, QUALITY_LOCK_ALL_ON);
  }, [getActiveStream, support]);

  const controls = useMemo(
    () =>
      QUALITY_LOCK_CONTROLS.map((control) => ({
        ...control,
        supported: support[control.id],
        locked: locks[control.id],
      })),
    [locks, support],
  );

  return {
    controls,
    toggle,
    relock,
    anySupported: isAnyQualityLockSupported(support),
  };
}
