"use client";

import { useCallback } from "react";

type ShowToast = (text: string, ok?: boolean) => void;

type ShareModalFile = {
  id: string;
};

type UseSlateDropTransferActionsParams = {
  showToast: ShowToast;
  shareModal: ShareModalFile | null;
  shareEmail: string;
  sharePerm: "view" | "edit";
  shareExpiry: string;
  closeShareModal: () => void;
  setShareSent: (value: boolean) => void;
};

export function useSlateDropTransferActions({
  showToast,
  shareModal,
  shareEmail,
  sharePerm,
  shareExpiry,
  closeShareModal,
  setShareSent,
}: UseSlateDropTransferActionsParams) {
  const handleDownloadFile = useCallback(async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(fileId)}`);
      const data = await response.json();
      if (!response.ok || !data.url) {
        showToast(data.error ?? `Download failed for ${fileName}`, false);
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
      showToast(`Download started: ${fileName}`);
    } catch {
      showToast(`Download failed for ${fileName}`, false);
    }
  }, [showToast]);

  const handleDownloadFolderZip = useCallback(async (folderId: string, folderName: string) => {
    try {
      const response = await fetch("/api/slatedrop/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: "ZIP failed" }));
        showToast(errorPayload.error ?? "ZIP failed", false);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${folderName || "slatedrop-folder"}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast(`ZIP downloaded: ${folderName}`);
    } catch {
      showToast(`ZIP failed for ${folderName}`, false);
    }
  }, [showToast]);

  const copyToClipboard = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied`);
    } catch {
      showToast(`Could not copy ${label.toLowerCase()}`, false);
    }
  }, [showToast]);

  const handleSendSecureLink = useCallback(async () => {
    if (!shareEmail.trim() || !shareModal) return;
    try {
      const response = await fetch("/api/slatedrop/secure-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: shareModal.id,
          email: shareEmail.trim(),
          permission: sharePerm === "edit" ? "download" : "view",
          expiryDays: shareExpiry === "never" ? 365 : parseInt(shareExpiry),
        }),
      });

      if (response.ok) {
        setShareSent(true);
        setTimeout(() => {
          closeShareModal();
        }, 2000);
      } else {
        const payload = await response.json();
        showToast(payload.error ?? "Send failed", false);
      }
    } catch {
      showToast("Send failed", false);
    }
  }, [closeShareModal, setShareSent, shareEmail, shareExpiry, shareModal, sharePerm, showToast]);

  return {
    handleDownloadFile,
    handleDownloadFolderZip,
    copyToClipboard,
    handleSendSecureLink,
  };
}