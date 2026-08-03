"use client";

import { useRef, useState } from "react";
import { FilePlus2, FolderOpen, Images } from "lucide-react";
import { SlateDropFilePickerModal } from "@/components/slatedrop/SlateDropFilePickerModal";
import type { SlateDropPickerFile } from "@/lib/slatedrop/file-picker-types";

type Props = {
  projectId: string | null;
  disabled?: boolean;
  onAddFiles: (files: File[], origin: "camera_roll" | "files") => void;
  onAddSlateDrop: (files: SlateDropPickerFile[]) => void;
};

export function TwinReviewSourcePicker({
  projectId,
  disabled = false,
  onAddFiles,
  onAddSlateDrop,
}: Props) {
  const [slateDropOpen, setSlateDropOpen] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);

  return (
    <>
      <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4" aria-labelledby="add-sources-heading">
        <div className="flex items-start gap-3">
          <FilePlus2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--graphite-muted)]" aria-hidden="true" />
          <div>
            <p id="add-sources-heading" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
              Add sources
            </p>
            <p className="mt-1 text-sm text-[var(--graphite-text-body)]">
              Add more photos, clips, or scans before you process.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <PickerButton label="Photos" icon={Images} disabled={disabled} onClick={() => photoInput.current?.click()} />
          <PickerButton label="Files" icon={FolderOpen} disabled={disabled} onClick={() => filesInput.current?.click()} />
          <PickerButton
            label="SlateDrop"
            icon={FolderOpen}
            disabled={disabled || !projectId}
            onClick={() => setSlateDropOpen(true)}
          />
        </div>

        <input
          ref={photoInput}
          type="file"
          accept="image/*,video/*"
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const files = event.target.files ? Array.from(event.target.files) : [];
            if (files.length) onAddFiles(files, "camera_roll");
            event.target.value = "";
          }}
        />
        <input
          ref={filesInput}
          type="file"
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const files = event.target.files ? Array.from(event.target.files) : [];
            if (files.length) onAddFiles(files, "files");
            event.target.value = "";
          }}
        />
      </section>

      <SlateDropFilePickerModal
        open={slateDropOpen}
        projectId={projectId}
        onClose={() => setSlateDropOpen(false)}
        onConfirm={onAddSlateDrop}
        title="Add from SlateDrop"
      />
    </>
  );
}

function PickerButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Images;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] px-2 text-xs font-semibold text-[var(--graphite-text-body)] transition-colors hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="h-4 w-4 text-[var(--graphite-muted)]" aria-hidden="true" />
      {label}
    </button>
  );
}
