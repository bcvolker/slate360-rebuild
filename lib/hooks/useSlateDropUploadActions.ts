"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { SlateDropFileItem } from "@/lib/hooks/useSlateDropFiles";

type ShowToast = (text: string, ok?: boolean) => void;

type UseSlateDropUploadActionsParams = {
  activeFolderId: string;
  breadcrumb: string[];
  refreshFolderFiles: (folderId: string) => Promise<void>;
  showToast: ShowToast;
  setUploadProgress: Dispatch<SetStateAction<Record<string, number>>>;
  setRealFiles: Dispatch<SetStateAction<Record<string, SlateDropFileItem[]>>>;
};

export function useSlateDropUploadActions({
  activeFolderId,
  breadcrumb,
  refreshFolderFiles,
  showToast,
  setUploadProgress,
  setRealFiles,
}: UseSlateDropUploadActionsParams) {
  const uploadFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    const folderPath = breadcrumb.join("/") || activeFolderId;

    for (const file of files) {
      const key = `${file.name}-${Date.now()}`;
      try {
        const urlResponse = await fetch("/api/slatedrop/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            folderId: activeFolderId,
            folderPath,
          }),
        });
        if (!urlResponse.ok) throw new Error("Failed to get upload URL");

        const { uploadUrl, fileId, s3Key } = await urlResponse.json();
        if (!uploadUrl || !fileId) throw new Error("Upload reservation failed");

        setUploadProgress((prev) => ({ ...prev, [key]: 10 }));
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!uploadResponse.ok) throw new Error("S3 upload failed");

        setUploadProgress((prev) => ({ ...prev, [key]: 80 }));
        const completeResponse = await fetch("/api/slatedrop/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        });
        if (!completeResponse.ok) throw new Error("Upload finalization failed");

        setUploadProgress((prev) => ({ ...prev, [key]: 100 }));

        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const newFile: SlateDropFileItem = {
          id: fileId ?? key,
          name: file.name,
          size: file.size,
          type: ext,
          modified: new Date().toISOString().slice(0, 10),
          folderId: activeFolderId,
          s3Key: s3Key ?? undefined,
        };

        setRealFiles((prev) => ({
          ...prev,
          [activeFolderId]: [...(prev[activeFolderId] ?? []), newFile],
        }));
      } catch (error) {
        console.error("[SlateDrop] upload error:", error);
        showToast(`Failed to upload ${file.name}`, false);
      } finally {
        setTimeout(() => {
          setUploadProgress((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 1000);
      }
    }

    await refreshFolderFiles(activeFolderId);
    showToast(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
  }, [activeFolderId, breadcrumb, refreshFolderFiles, setRealFiles, setUploadProgress, showToast]);

  return {
    uploadFiles,
  };
}