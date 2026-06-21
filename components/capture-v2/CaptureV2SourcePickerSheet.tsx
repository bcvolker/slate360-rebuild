"use client";

import { useRef, type PointerEvent } from "react";
import { Camera, FileUp, FolderOpen, Images, Lock, Orbit } from "lucide-react";
import type { AppIcon } from "@/lib/types/app-icon";
import type { CaptureV2SourcePickerRow, CaptureV2SourcePickerRowId } from "@/lib/capture-v2/source-picker-types";
import { captureV2SourcePickerTokens } from "./capture-v2-source-picker-tokens";

const ROW_ICONS: Record<CaptureV2SourcePickerRowId, AppIcon> = {
  take_photo: Camera,
  camera_roll: Images,
  upload_file: FileUp,
  photo_360_project: FolderOpen,
  photo_360: Orbit,
};

const SWIPE_CLOSE_PX = 48;

type Props = {
  open: boolean;
  title: string;
  subtitle: string;
  rows: CaptureV2SourcePickerRow[];
  onClose: () => void;
  onSelect: (rowId: CaptureV2SourcePickerRowId) => void;
};

export function CaptureV2SourcePickerSheet({
  open,
  title,
  subtitle,
  rows,
  onClose,
  onSelect,
}: Props) {
  const dragRef = useRef<{ startY: number } | null>(null);

  if (!open) return null;

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    dragRef.current = { startY: event.clientY };
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    const origin = dragRef.current;
    dragRef.current = null;
    if (!origin) return;
    if (event.clientY - origin.startY > SWIPE_CLOSE_PX) onClose();
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[35]"
      data-capture-chrome="source-picker-root"
      aria-hidden={!open}
    >
      <button
        type="button"
        className={captureV2SourcePickerTokens.scrim}
        aria-label="Dismiss source picker"
        onClick={onClose}
        data-capture-chrome="source-picker-scrim"
      />
      <section
        role="dialog"
        aria-modal="false"
        aria-label="Capture sources"
        className={captureV2SourcePickerTokens.frame}
        data-capture-chrome="source-picker-sheet"
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
          maxHeight: "calc(min(80dvh, 24rem) + env(safe-area-inset-bottom, 0px))",
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        <span className={captureV2SourcePickerTokens.handle} aria-hidden />
        <header className={captureV2SourcePickerTokens.header}>
          <h2 className={captureV2SourcePickerTokens.title}>{title}</h2>
          <p className={captureV2SourcePickerTokens.subtitle}>{subtitle}</p>
        </header>
        <ul className={captureV2SourcePickerTokens.list}>
          {rows.map((row) => {
            const Icon = ROW_ICONS[row.id];
            const locked = Boolean(row.locked);
            return (
              <li key={row.id} className="pb-1.5">
                <button
                  type="button"
                  disabled={locked}
                  data-capture-chrome="source-picker-row"
                  data-source-row={row.id}
                  className={`${captureV2SourcePickerTokens.row} ${locked ? captureV2SourcePickerTokens.rowLocked : ""}`}
                  onClick={() => onSelect(row.id)}
                >
                  <span
                    className={
                      locked
                        ? captureV2SourcePickerTokens.iconWellLocked
                        : captureV2SourcePickerTokens.iconWell
                    }
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className={captureV2SourcePickerTokens.rowInline}>
                    <span className={captureV2SourcePickerTokens.rowText}>{row.label}</span>
                    <span className={captureV2SourcePickerTokens.rowMeta} aria-hidden>
                      ·
                    </span>
                    <span className={`${captureV2SourcePickerTokens.rowMeta} truncate`}>
                      {row.description}
                    </span>
                  </span>
                  {locked ? (
                    <span className={captureV2SourcePickerTokens.lockBadge}>
                      <Lock className="mr-1 inline size-3" aria-hidden />
                      {row.lockReason ?? "Locked"}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
