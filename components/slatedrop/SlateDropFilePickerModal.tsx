"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Folder, Loader2, X } from "lucide-react";
import { useSlateDropFilePicker } from "@/lib/hooks/useSlateDropFilePicker";
import { formatBytes, getFileColor, getFileIcon } from "@/lib/slatedrop/helpers";
import type { SlateDropPickerFile } from "@/lib/slatedrop/file-picker-types";
import { cn } from "@/lib/utils";

export type SlateDropFilePickerModalProps = {
  open: boolean;
  projectId: string | null;
  onClose: () => void;
  onConfirm: (files: SlateDropPickerFile[]) => void;
  maxFiles?: number;
  title?: string;
  zIndexClass?: string;
};

export function SlateDropFilePickerModal({
  open,
  projectId,
  onClose,
  onConfirm,
  maxFiles = 4,
  title = "Attach from SlateDrop",
  zIndexClass = "z-[3000]",
}: SlateDropFilePickerModalProps) {
  const {
    foldersLoading,
    rootFolders,
    childFolders,
    activeFolderId,
    setActiveFolderId,
    activeFolder,
    filesLoading,
    files,
    filesError,
    selectedIds,
    selectedFiles,
    toggleFile,
    reset,
  } = useSlateDropFilePicker(projectId, open);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  if (!open) return null;

  const atLimit = selectedIds.size >= maxFiles;
  const canConfirm = selectedFiles.length > 0;

  function handleToggle(fileId: string) {
    if (selectedIds.has(fileId)) {
      toggleFile(fileId);
      return;
    }
    if (atLimit) return;
    toggleFile(fileId);
  }

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(selectedFiles.slice(0, maxFiles));
    onClose();
  }

  const body = (
    <div className={cn("fixed inset-0 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4", zIndexClass)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] border border-white/15 bg-[color-mix(in_srgb,var(--graphite-canvas)_96%,transparent)] shadow-2xl backdrop-blur-xl sm:rounded-[1.5rem]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--graphite-primary)]">{title}</p>
            <p className="mt-1 text-xs font-semibold text-white/65">
              Browse project folders and select up to {maxFiles} files.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close file picker"
            className="rounded-full border border-white/15 p-2 text-white/80 transition hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
          {!projectId ? (
            <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/55">
              No project linked to this capture session.
            </p>
          ) : (
            <>
              <FolderRow
                label="Folders"
                loading={foldersLoading}
                folders={rootFolders}
                activeFolderId={activeFolderId}
                onSelect={setActiveFolderId}
              />

              {childFolders.length > 0 ? (
                <FolderRow
                  label={activeFolder?.name ?? "Subfolders"}
                  loading={false}
                  folders={childFolders}
                  activeFolderId={activeFolderId}
                  onSelect={setActiveFolderId}
                  nested
                />
              ) : null}

              <div className="mt-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                  {activeFolder?.name ?? "Files"}
                </p>

                {filesLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-white/60">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--graphite-primary)]" />
                    Loading files…
                  </div>
                ) : filesError ? (
                  <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-4 text-sm text-rose-100">
                    {filesError}
                  </p>
                ) : files.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-white/50">
                    No files in this folder yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {files.map((file) => {
                      const selected = selectedIds.has(file.id);
                      const disabled = !selected && atLimit;
                      const Icon = getFileIcon(file.type);
                      const color = getFileColor(file.type);
                      return (
                        <li key={file.id}>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleToggle(file.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition",
                              selected
                                ? "border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
                                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]",
                              disabled && "opacity-45",
                            )}
                          >
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30"
                              style={{ color }}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-white">{file.name}</span>
                              <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-white/45">
                                {file.type || "file"} · {formatBytes(file.size)}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                                selected
                                  ? "border-[var(--graphite-primary)] bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]"
                                  : "border-white/20 bg-transparent text-transparent",
                              )}
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/10 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-white/55">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select files to attach"}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-2xl border border-white/15 px-4 text-sm font-semibold text-white/80"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="min-h-10 rounded-2xl bg-[var(--graphite-primary)] px-4 text-sm font-black text-[var(--graphite-canvas)] disabled:opacity-45"
            >
              Attach
            </button>
          </div>
        </footer>
      </div>
    </div>
  );

  if (typeof document === "undefined") return body;
  return createPortal(body, document.body);
}

function FolderRow({
  label,
  loading,
  folders,
  activeFolderId,
  onSelect,
  nested = false,
}: {
  label: string;
  loading: boolean;
  folders: Array<{ id: string; name: string }>;
  activeFolderId: string | null;
  onSelect: (folderId: string) => void;
  nested?: boolean;
}) {
  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-white/55", nested && "mt-3")}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--graphite-primary)]" />
        Loading folders…
      </div>
    );
  }

  if (folders.length === 0) return null;

  return (
    <div className={cn(nested && "mt-3")}>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {folders.map((folder) => {
          const active = folder.id === activeFolderId;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelect(folder.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition",
                active
                  ? "border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] text-[var(--graphite-primary)]"
                  : "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06]",
              )}
            >
              <Folder className="h-3.5 w-3.5" />
              <span className="max-w-[9rem] truncate">{folder.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
