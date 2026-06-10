"use client";

import { useRef } from "react";
import { FolderOpen, Images, X } from "lucide-react";
import type { TwinReviewAddedSource } from "@/lib/digital-twin/twin-capture-pending-session";
import {
  classifyTwinMedia,
  hasMixedTwinMediaCategories,
  type TwinMediaCategory,
} from "@/lib/digital-twin/twin-review-media";

type Props = {
  projectId: string;
  addedSources: TwinReviewAddedSource[];
  captureCategories: TwinMediaCategory[];
  onAddFiles: (files: File[], origin: "camera_roll" | "files") => void;
  onRemoveSource: (id: string) => void;
  onOpenSlateDrop: () => void;
};

export function TwinCaptureReviewSources({
  addedSources,
  captureCategories,
  onAddFiles,
  onRemoveSource,
  onOpenSlateDrop,
}: Props) {
  const rollRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  const addedCategories = addedSources.map((source) =>
    source.origin === "slatedrop"
      ? classifyTwinMedia(
          new File([], source.pickerFile.name, {
            type: source.pickerFile.type || "application/octet-stream",
          }),
        )
      : classifyTwinMedia(source.file),
  );
  const showMixWarning = hasMixedTwinMediaCategories([
    ...captureCategories,
    ...addedCategories,
  ]);

  return (
    <section className="space-y-3">
      <p className="text-sm font-semibold text-[var(--graphite-text-header)]">
        Add sources to this scan
      </p>
      <div className="grid grid-cols-3 gap-2">
        <SourceButton
          label="Camera roll"
          icon={Images}
          onClick={() => rollRef.current?.click()}
        />
        <SourceButton
          label="Files"
          icon={FolderOpen}
          onClick={() => filesRef.current?.click()}
        />
        <SourceButton label="SlateDrop" icon={FolderOpen} onClick={onOpenSlateDrop} />
      </div>

      <input
        ref={rollRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const list = event.target.files ? Array.from(event.target.files) : [];
          if (list.length) onAddFiles(list, "camera_roll");
          event.target.value = "";
        }}
      />
      <input
        ref={filesRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const list = event.target.files ? Array.from(event.target.files) : [];
          if (list.length) onAddFiles(list, "files");
          event.target.value = "";
        }}
      />

      {showMixWarning ? (
        <p className="text-[11px] leading-snug text-[var(--graphite-muted)]">
          Mixing different camera types (e.g. 360° video with phone video) can reduce reconstruction
          quality.
        </p>
      ) : null}

      {addedSources.length > 0 ? (
        <ul className="space-y-1.5">
          {addedSources.map((source) => (
            <li
              key={source.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-3 py-2"
            >
              <span className="truncate text-xs text-[var(--graphite-text-body)]">
                {source.origin === "slatedrop" ? source.pickerFile.name : source.file.name}
              </span>
              <button
                type="button"
                onClick={() => onRemoveSource(source.id)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
                aria-label="Remove source"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function SourceButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof Images;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] px-2 py-2 text-center backdrop-blur-md transition active:scale-[0.98]"
    >
      <Icon className="h-4 w-4 text-[var(--twin360-blue)]" />
      <span className="text-[10px] font-semibold text-[var(--graphite-text-body)]">{label}</span>
    </button>
  );
}
