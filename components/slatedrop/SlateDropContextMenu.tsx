import {
  ArrowUpRight,
  Copy,
  Download,
  Edit3,
  Eye,
  FolderOpen,
  Scissors,
  Send,
  Trash2,
  type LucideIcon,
} from "lucide-react";

type ContextMenuFileTarget = {
  type: "file";
  id: string;
  file_name: string;
  s3_key: string;
  file_type: string;
  size: number;
  modified: string;
  folderId: string;
  thumbnail?: string;
  locked?: boolean;
};

type ContextMenuFolderTarget = {
  type: "folder";
  id: string;
  path: string;
  name: string;
  isSystem?: boolean;
};

export type SlateDropContextMenuState = {
  x: number;
  y: number;
  target: ContextMenuFileTarget | ContextMenuFolderTarget;
};

type SlateDropContextMenuProps = {
  contextMenu: SlateDropContextMenuState | null;
  activeFolderId: string;
  currentFiles: Array<{ id: string; name: string }>;
  onClose: () => void;
  onOpenFolder: (folderId: string) => void;
  onDownloadFile: (fileId: string, fileName: string) => void;
  onDownloadFolderZip: (folderId: string, folderName: string) => void;
  onRenameFile: (target: ContextMenuFileTarget) => void;
  onCopyFileName: (fileName: string) => void;
  onMoveFile: (target: ContextMenuFileTarget, activeFolderId: string) => void;
  onOpenShare: (target: ContextMenuFileTarget) => void;
  onDeleteFile: (target: ContextMenuFileTarget) => void;
  onCopyFolderName: (folderName: string) => void;
  onRenameFolder: (target: ContextMenuFolderTarget) => void;
  onDeleteFolderOrProject: (target: ContextMenuFolderTarget, isProjectNode: boolean) => void;
  onPreviewFile: (target: ContextMenuFileTarget) => void;
};

export default function SlateDropContextMenu({
  contextMenu,
  activeFolderId,
  currentFiles,
  onClose,
  onOpenFolder,
  onDownloadFile,
  onDownloadFolderZip,
  onRenameFile,
  onCopyFileName,
  onMoveFile,
  onOpenShare,
  onDeleteFile,
  onCopyFolderName,
  onRenameFolder,
  onDeleteFolderOrProject,
  onPreviewFile,
}: SlateDropContextMenuProps) {
  if (!contextMenu) return null;

  return (
    <div
      className="fixed z-[100] w-52 bg-white rounded-xl border border-gray-100 shadow-2xl overflow-hidden py-1"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={(e) => e.stopPropagation()}
    >
      {contextMenu.target.type === "file" && (() => {
        const target = contextMenu.target;
        return (
          <>
            <CtxItem icon={Eye} label="Preview" onClick={() => {
              onPreviewFile(target);
              onClose();
            }} />
            <CtxItem icon={Download} label="Download" onClick={() => {
              const file = currentFiles.find((f) => f.id === target.id);
              onClose();
              if (file) onDownloadFile(file.id, file.name);
            }} />
            <CtxDivider />
            <CtxItem icon={Edit3} label="Rename" onClick={() => {
              onRenameFile(target);
              onClose();
            }} />
            <CtxItem icon={Copy} label="Copy" onClick={() => {
              onCopyFileName(target.file_name);
              onClose();
            }} />
            <CtxItem icon={Scissors} label="Move" onClick={() => {
              onMoveFile(target, activeFolderId);
              onClose();
            }} />
            <CtxDivider />
            <CtxItem
              icon={Send}
              label="Secure Send"
              accent
              onClick={() => {
                onOpenShare(target);
                onClose();
              }}
            />
            <CtxDivider />
            <CtxItem icon={Trash2} label="Delete" danger onClick={() => {
              onDeleteFile(target);
              onClose();
            }} />
          </>
        );
      })()}

      {contextMenu.target.type === "folder" && (() => {
        const target = contextMenu.target;
        const isProjectNode = false;
        return (
          <>
            <CtxItem icon={FolderOpen} label="Open" onClick={() => {
              onOpenFolder(target.id);
              onClose();
            }} />
            <CtxItem icon={Download} label="Download as ZIP" onClick={() => {
              onClose();
              onDownloadFolderZip(target.id, target.name);
            }} />
            <CtxDivider />
            <CtxItem icon={Copy} label="Copy" onClick={() => {
              onCopyFolderName(target.name);
              onClose();
            }} />
            {!target.isSystem && !isProjectNode && (
              <CtxItem icon={Edit3} label="Rename" onClick={() => {
                onRenameFolder(target);
                onClose();
              }} />
            )}
            {!target.isSystem && (
              <>
                <CtxDivider />
                <CtxItem icon={Trash2} label="Delete" danger onClick={() => {
                  onDeleteFolderOrProject(target, isProjectNode);
                  onClose();
                }} />
              </>
            )}
          </>
        );
      })()}
    </div>
  );
}

function CtxItem({
  icon: Icon,
  label,
  onClick,
  danger,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors ${
        danger
          ? "text-red-500 hover:bg-red-50"
          : accent
          ? "text-[#D4AF37] hover:bg-[#D4AF37]/5 font-semibold"
          : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function CtxDivider() {
  return <div className="my-1 mx-3 border-t border-gray-100" />;
}
