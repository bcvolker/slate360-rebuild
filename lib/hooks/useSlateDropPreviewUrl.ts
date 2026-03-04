"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

type PreviewFile = {
  id: string;
};

type UseSlateDropPreviewUrlParams = {
  previewFile: PreviewFile | null;
  setPreviewUrl: Dispatch<SetStateAction<string | null>>;
  setPreviewError: Dispatch<SetStateAction<string | null>>;
  setPreviewLoading: Dispatch<SetStateAction<boolean>>;
};

export function useSlateDropPreviewUrl({
  previewFile,
  setPreviewUrl,
  setPreviewError,
  setPreviewLoading,
}: UseSlateDropPreviewUrlParams) {
  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;

    const fetchPreviewUrl = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const response = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(previewFile.id)}&mode=preview`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.url) {
          throw new Error(data.error ?? "Preview unavailable");
        }
        if (!cancelled) setPreviewUrl(data.url);
      } catch (error) {
        if (!cancelled) {
          setPreviewUrl(null);
          setPreviewError(error instanceof Error ? error.message : "Preview unavailable");
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };

    void fetchPreviewUrl();

    return () => {
      cancelled = true;
    };
  }, [previewFile, setPreviewError, setPreviewLoading, setPreviewUrl]);
}