import {
  CheckCircle2,
  Download,
  Loader2,
  Send,
  Share2,
  X,
  type LucideIcon,
} from "lucide-react";
import ContactPicker from "@/components/shared/ContactPicker";
import type { DbFile } from "@/lib/slatedrop/helpers";

type ShareModalFile = DbFile | null;
type PreviewFile = DbFile | null;

type SlateDropSharePreviewModalsProps = {
  shareModal: ShareModalFile;
  shareSent: boolean;
  shareEmail: string;
  sharePerm: "view" | "edit";
  shareExpiry: string;
  setShareEmail: React.Dispatch<React.SetStateAction<string>>;
  setSharePerm: React.Dispatch<React.SetStateAction<"view" | "edit">>;
  setShareExpiry: React.Dispatch<React.SetStateAction<string>>;
  closeShareModal: () => void;
  onSendSecureLink: () => Promise<void>;

  previewFile: PreviewFile;
  previewUrl: string | null;
  previewLoading: boolean;
  previewError: string | null;
  setPreviewFile: React.Dispatch<React.SetStateAction<PreviewFile>>;
  onDownloadPreviewFile: (fileId: string, fileName: string) => void;
  onOpenShareFromPreview: (file: NonNullable<PreviewFile>) => void;
  getFileIcon: (type: string) => LucideIcon;
  getFileColor: (type: string) => string;
  formatBytes: (bytes: number) => string;
  formatDate: (dateStr: string) => string;
};

export default function SlateDropSharePreviewModals({
  shareModal,
  shareSent,
  shareEmail,
  sharePerm,
  shareExpiry,
  setShareEmail,
  setSharePerm,
  setShareExpiry,
  closeShareModal,
  onSendSecureLink,
  previewFile,
  previewUrl,
  previewLoading,
  previewError,
  setPreviewFile,
  onDownloadPreviewFile,
  onOpenShareFromPreview,
  getFileIcon,
  getFileColor,
  formatBytes,
  formatDate,
}: SlateDropSharePreviewModalsProps) {
  return (
    <>
      {shareModal && (
        <ModalBackdrop onClose={closeShareModal}>
          <div className="w-full max-w-md bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-[var(--graphite-text-body)]">Secure Send</h3>
                <p className="text-xs text-[var(--graphite-muted)] mt-0.5">Share &quot;{shareModal.file_name}&quot;</p>
              </div>
              <button onClick={closeShareModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--graphite-muted)] hover:bg-white/[0.06]">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              {shareSent ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500" />
                  <p className="text-sm font-semibold text-[var(--graphite-text-body)] mb-1">Link sent!</p>
                  <p className="text-xs text-[var(--graphite-muted)]">A secure share link was sent to {shareEmail}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider mb-1.5">Recipient email</label>
                    <ContactPicker
                      inline
                      value={shareEmail}
                      onChange={(v) => setShareEmail(v)}
                      onSelect={(c) => setShareEmail(c.email ?? c.name)}
                      placeholder="Search contacts or type email…"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider mb-1.5">Permission</label>
                    <div className="flex gap-2">
                      {(["view", "edit"] as const).map((permission) => (
                        <button
                          key={permission}
                          onClick={() => setSharePerm(permission)}
                          className={`flex-1 text-xs font-semibold py-2.5 rounded-lg border transition-all capitalize ${
                            sharePerm === permission
                              ? "border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_5%,transparent)] text-[var(--graphite-primary)]"
                              : "border-white/10 text-[var(--graphite-muted)] hover:bg-white/[0.03]"
                          }`}
                        >
                          {permission === "view" ? "View only" : "Can upload"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider mb-1.5">Link expires</label>
                    <select
                      value={shareExpiry}
                      onChange={(event) => setShareExpiry(event.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)] focus:border-[var(--graphite-primary)] transition-all bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)]"
                    >
                      <option value="1">1 day</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                  <button
                    onClick={onSendSecureLink}
                    disabled={!shareEmail.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-foreground transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "var(--graphite-primary)" }}
                  >
                    <Send size={14} /> Send secure link
                  </button>
                </div>
              )}
            </div>
          </div>
        </ModalBackdrop>
      )}

      {previewFile && (
        <ModalBackdrop onClose={() => setPreviewFile(null)}>
          <div className="w-full max-w-2xl bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                {(() => {
                  const Icon = getFileIcon(previewFile.file_type);
                  const color = getFileColor(previewFile.file_type);
                  return <Icon size={18} style={{ color }} />;
                })()}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--graphite-text-body)] truncate">{previewFile.file_name}</p>
                  <p className="text-[10px] text-[var(--graphite-muted)]">{formatBytes(previewFile.size)} · {formatDate(previewFile.modified)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDownloadPreviewFile(previewFile.id, previewFile.file_name)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--graphite-muted)] hover:bg-white/[0.06]"
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={() => onOpenShareFromPreview(previewFile)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--graphite-muted)] hover:bg-white/[0.06]"
                >
                  <Share2 size={15} />
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--graphite-muted)] hover:bg-white/[0.06]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center bg-white/[0.03] min-h-[300px] p-8">
              {previewLoading ? (
                <div className="text-center">
                  <Loader2 size={32} className="mx-auto mb-3 animate-spin text-[var(--graphite-primary)]" />
                  <p className="text-sm text-[var(--graphite-muted)] font-medium">Loading preview…</p>
                </div>
              ) : previewError ? (
                <div className="text-center">
                  <p className="text-sm text-[var(--graphite-muted)] font-medium">Preview not available</p>
                  <p className="text-xs text-[var(--graphite-muted)] mt-1">{previewError}</p>
                </div>
              ) : previewUrl ? (
                (() => {
                  const fileType = previewFile.file_type.toLowerCase();

                  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(fileType)) {
                    return (
                      <img
                        src={previewUrl}
                        alt={previewFile.file_name}
                        className="max-h-[460px] rounded-lg shadow-md object-contain"
                      />
                    );
                  }

                  if (["mp4", "mov", "webm", "m4v"].includes(fileType)) {
                    return (
                      <video
                        src={previewUrl}
                        controls
                        className="w-full h-[460px] rounded-lg border border-white/10 bg-black"
                      />
                    );
                  }

                  if (["mp3", "wav", "m4a", "ogg"].includes(fileType)) {
                    return (
                      <div className="w-full rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] p-6">
                        <audio src={previewUrl} controls className="w-full" />
                      </div>
                    );
                  }

                  return (
                    <iframe
                      src={previewUrl}
                      title={previewFile.file_name}
                      className="w-full h-[460px] rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)]"
                    />
                  );
                })()
              ) : (
                <div className="text-center">
                  {(() => {
                    const Icon = getFileIcon(previewFile.file_type);
                    const color = getFileColor(previewFile.file_type);
                    return (
                      <>
                        <Icon size={56} style={{ color }} className="mx-auto mb-4 opacity-50" />
                        <p className="text-sm text-[var(--graphite-muted)] font-medium">Preview not available</p>
                        <p className="text-xs text-[var(--graphite-muted)] mt-1">Download the file to view it locally</p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </ModalBackdrop>
      )}
    </>
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
