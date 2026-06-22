import { Folder, Info, Trash2, X } from "lucide-react";
import type { SlateDropFolderNode as FolderNode } from "@/lib/slatedrop/folderTree";

type NewFolderModalState = { parentId: string; name: string } | null;
type RenameModalState = { id: string; name: string; type: "file" | "folder" } | null;
type DeleteConfirmState = { id: string; name: string; type: "file" | "folder" | "project" } | null;
type MoveModalState = { id: string; name: string; type: "file" | "bulk"; ids?: string[] } | null;
type InfoModalState = { name: string; typeLabel: string; sizeLabel: string; modifiedLabel: string } | null;

type SlateDropActionModalsProps = {
  newFolderModal: NewFolderModalState;
  setNewFolderModal: React.Dispatch<React.SetStateAction<NewFolderModalState>>;
  onCreateFolder: (parentId: string, folderName: string) => Promise<void>;

  renameModal: RenameModalState;
  setRenameModal: React.Dispatch<React.SetStateAction<RenameModalState>>;
  renameValue: string;
  setRenameValue: React.Dispatch<React.SetStateAction<string>>;
  onRename: (modal: NonNullable<RenameModalState>, newName: string) => Promise<void>;

  deleteConfirm: DeleteConfirmState;
  setDeleteConfirm: React.Dispatch<React.SetStateAction<DeleteConfirmState>>;
  deleteProjectConfirmName: string;
  setDeleteProjectConfirmName: React.Dispatch<React.SetStateAction<string>>;
  onDeleteConfirm: (target: NonNullable<DeleteConfirmState>, projectConfirmName: string) => Promise<void>;

  moveModal: MoveModalState;
  setMoveModal: React.Dispatch<React.SetStateAction<MoveModalState>>;
  moveTargetFolder: string | null;
  setMoveTargetFolder: React.Dispatch<React.SetStateAction<string | null>>;
  folderTree: FolderNode[];
  activeFolderId: string;
  onMoveFile: (fileId: string, targetFolderId: string) => Promise<void>;
  onMoveFiles: (fileIds: string[], targetFolderId: string) => Promise<void> | void;

  infoModal: InfoModalState;
  setInfoModal: React.Dispatch<React.SetStateAction<InfoModalState>>;
};

export default function SlateDropActionModals({
  newFolderModal,
  setNewFolderModal,
  onCreateFolder,
  renameModal,
  setRenameModal,
  renameValue,
  setRenameValue,
  onRename,
  deleteConfirm,
  setDeleteConfirm,
  deleteProjectConfirmName,
  setDeleteProjectConfirmName,
  onDeleteConfirm,
  moveModal,
  setMoveModal,
  moveTargetFolder,
  setMoveTargetFolder,
  folderTree,
  activeFolderId,
  onMoveFile,
  onMoveFiles,
  infoModal,
  setInfoModal,
}: SlateDropActionModalsProps) {
  return (
    <>
      {newFolderModal && (
        <ModalBackdrop onClose={() => setNewFolderModal(null)}>
          <div className="w-full max-w-sm bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-base font-bold text-[var(--graphite-text-body)]">New Folder</h3>
              <button
                onClick={() => setNewFolderModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--graphite-muted)] hover:bg-white/[0.06]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={newFolderModal.name}
                onChange={(event) => setNewFolderModal((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                placeholder="Folder name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)] focus:border-[var(--graphite-primary)] transition-all mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setNewFolderModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-[var(--graphite-text-body)] hover:bg-white/[0.03] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newFolderModal) return;
                    const folderName = newFolderModal.name.trim();
                    if (!folderName) return;
                    await onCreateFolder(newFolderModal.parentId, folderName);
                  }}
                  disabled={!newFolderModal.name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-foreground transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--graphite-primary)" }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {renameModal && (
        <ModalBackdrop onClose={() => setRenameModal(null)}>
          <div className="w-full max-w-sm bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-base font-bold text-[var(--graphite-text-body)]">Rename {renameModal.type}</h3>
              <button onClick={() => setRenameModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--graphite-muted)] hover:bg-white/[0.06]">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)] focus:border-[var(--graphite-primary)] transition-all mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setRenameModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-[var(--graphite-text-body)] hover:bg-white/[0.03] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!renameModal || !renameValue.trim()) return;
                    await onRename(renameModal, renameValue.trim());
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-foreground transition-all hover:opacity-90"
                  style={{ backgroundColor: "var(--graphite-primary)" }}
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {deleteConfirm && (
        <ModalBackdrop onClose={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-[var(--graphite-text-body)] mb-2">Delete {deleteConfirm.type}?</h3>
              <p className="text-xs text-[var(--graphite-muted)] mb-6">
                &quot;{deleteConfirm.name}&quot; will be permanently deleted. This action cannot be undone.
              </p>

              {deleteConfirm.type === "project" && (
                <div className="text-left mb-6">
                  <label className="block text-xs font-semibold text-[var(--graphite-text-body)] mb-1.5">
                    Type <span className="font-black text-red-400">{deleteConfirm.name}</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteProjectConfirmName}
                    onChange={(event) => setDeleteProjectConfirmName(event.target.value)}
                    placeholder="Enter project name..."
                    className="w-full rounded-xl border border-white/10 px-3.5 py-2.5 text-sm text-[var(--graphite-text-body)] placeholder-gray-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-[var(--graphite-text-body)] hover:bg-white/[0.03] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!deleteConfirm) return;
                    await onDeleteConfirm(deleteConfirm, deleteProjectConfirmName);
                  }}
                  disabled={
                    deleteConfirm.type === "project" &&
                    deleteProjectConfirmName.trim() !== deleteConfirm.name
                  }
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {moveModal && (
        <ModalBackdrop onClose={() => setMoveModal(null)}>
          <div className="w-full max-w-md bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-[var(--graphite-text-body)]">{moveModal.type === "bulk" ? "Move Files" : "Move File"}</h3>
                <p className="text-xs text-[var(--graphite-muted)] mt-0.5">Select destination for &quot;{moveModal.name}&quot;</p>
              </div>
              <button onClick={() => setMoveModal(null)} className="text-[var(--graphite-muted)] hover:text-[var(--graphite-text-body)] transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="max-h-60 overflow-y-auto border border-white/10 rounded-xl p-2 mb-6">
                {(() => {
                  const allFolders: { id: string; name: string; path: string }[] = [];
                  const traverse = (nodes: FolderNode[], path = "") => {
                    nodes.forEach((node) => {
                      const currentPath = path ? `${path}/${node.id}` : node.id;
                      allFolders.push({ id: node.id, name: node.name, path: currentPath });
                      traverse(node.children, currentPath);
                    });
                  };
                  traverse(folderTree);
                  return allFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => setMoveTargetFolder(folder.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        moveTargetFolder === folder.id ? "bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-primary)] font-medium" : "hover:bg-white/[0.03] text-[var(--graphite-text-body)]"
                      }`}
                    >
                      <Folder size={16} className={moveTargetFolder === folder.id ? "text-[var(--graphite-primary)]" : "text-[var(--graphite-muted)]"} />
                      {folder.name}
                    </button>
                  ));
                })()}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMoveModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[var(--graphite-text-body)] bg-white/[0.06] hover:bg-white/[0.08] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!moveTargetFolder || moveTargetFolder === activeFolderId || !moveModal) {
                      setMoveModal(null);
                      return;
                    }
                    if (moveModal.type === "bulk" && moveModal.ids?.length) {
                      await onMoveFiles(moveModal.ids, moveTargetFolder);
                    } else {
                      await onMoveFile(moveModal.id, moveTargetFolder);
                    }
                  }}
                  disabled={!moveTargetFolder || moveTargetFolder === activeFolderId}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-foreground transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--graphite-primary)" }}
                >
                  Move Here
                </button>
              </div>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {infoModal && (
        <ModalBackdrop onClose={() => setInfoModal(null)}>
          <div className="w-full max-w-sm bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-[var(--graphite-primary)]" />
                <h3 className="text-base font-bold text-[var(--graphite-text-body)]">Get Info</h3>
              </div>
              <button onClick={() => setInfoModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--graphite-muted)] hover:bg-white/[0.06]">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 break-words text-sm font-semibold text-[var(--graphite-text-body)]">{infoModal.name}</p>
              <dl className="space-y-2.5 text-xs">
                <InfoRow label="Type" value={infoModal.typeLabel} />
                <InfoRow label="Size" value={infoModal.sizeLabel} />
                <InfoRow label="Modified" value={infoModal.modifiedLabel} />
              </dl>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[var(--graphite-muted)]">{label}</dt>
      <dd className="truncate text-right font-medium text-[var(--graphite-text-body)]">{value}</dd>
    </div>
  );
}

function ModalBackdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative z-10 w-full flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
