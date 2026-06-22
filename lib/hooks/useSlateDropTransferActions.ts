"use client";

import { useCallback } from "react";

type ShowToast = (text: string, ok?: boolean) => void;

type ShareModalFile = {
  id: string;
};

type UseSlateDropTransferActionsParams = {
  showToast: ShowToast;
  shareModal: ShareModalFile | null;
  shareChannel: "email" | "sms";
  shareEmail: string;
  sharePhone: string;
  sharePerm: "view" | "edit";
  shareExpiry: string;
  closeShareModal: () => void;
  setShareSent: (value: boolean) => void;
};

export function useSlateDropTransferActions({
  showToast,
  shareModal,
  shareChannel,
  shareEmail,
  sharePhone,
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
    if (!shareModal) return;
    const recipient = shareChannel === "sms" ? sharePhone.trim() : shareEmail.trim();
    if (!recipient) return;
    try {
      const response = await fetch("/api/slatedrop/secure-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: shareModal.id,
          ...(shareChannel === "sms" ? { phone: recipient } : { email: recipient }),
          permission: sharePerm === "edit" ? "download" : "view",
          expiryDays: shareExpiry === "never" ? 365 : parseInt(shareExpiry),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        // The route reports per-channel outcome; SMS can fail (e.g. Twilio unset)
        // even when the link is created.
        if (shareChannel === "sms" && payload.smsSent === false) {
          showToast(payload.smsError ?? "Could not send the text message.", false);
          return;
        }
        setShareSent(true);
        setTimeout(() => {
          closeShareModal();
        }, 2000);
      } else {
        showToast(payload.error ?? "Send failed", false);
      }
    } catch {
      showToast("Send failed", false);
    }
  }, [closeShareModal, setShareSent, shareChannel, shareEmail, sharePhone, shareExpiry, shareModal, sharePerm, showToast]);

  // Public link: mint a share token with no recipient and copy the URL.
  const handleCopyShareLink = useCallback(async () => {
    if (!shareModal) return;
    try {
      const response = await fetch("/api/slatedrop/secure-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: shareModal.id,
          permission: sharePerm === "edit" ? "download" : "view",
          expiryDays: shareExpiry === "never" ? 365 : parseInt(shareExpiry),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.shareUrl) {
        await copyToClipboard(payload.shareUrl, "Share link");
      } else {
        showToast(payload.error ?? "Could not create link", false);
      }
    } catch {
      showToast("Could not create link", false);
    }
  }, [copyToClipboard, shareExpiry, shareModal, sharePerm, showToast]);

  // Right-click "Copy link": mint a public view link for a file directly,
  // without opening the share modal (default view permission, 1-year expiry).
  const handleQuickCopyLink = useCallback(async (fileId: string) => {
    try {
      const response = await fetch("/api/slatedrop/secure-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, permission: "view", expiryDays: 365 }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.shareUrl) {
        await copyToClipboard(payload.shareUrl, "Share link");
      } else {
        showToast(payload.error ?? "Could not create link", false);
      }
    } catch {
      showToast("Could not create link", false);
    }
  }, [copyToClipboard, showToast]);

  return {
    handleDownloadFile,
    handleDownloadFolderZip,
    copyToClipboard,
    handleSendSecureLink,
    handleCopyShareLink,
    handleQuickCopyLink,
  };
}