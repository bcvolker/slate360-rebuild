"use client";

import { useCallback, useState } from "react";
import { TourPanoViewer } from "@/components/tours/TourPanoViewer";
import type { VnextPanoSourceData } from "@/lib/vnext/explore-types";
import { VnextViewerMediaError } from "./VnextViewerMediaError";

export default function VnextPanoViewer({ data }: { data: VnextPanoSourceData }) {
  const [mediaError, setMediaError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const retry = useCallback(() => {
    setMediaError(false);
    setRetryAttempt((n) => n + 1);
  }, []);

  if (mediaError) {
    return (
      <div className="relative h-full w-full">
        <VnextViewerMediaError onRetry={retry} />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <TourPanoViewer
        key={retryAttempt}
        src={retryAttempt > 0 ? `${data.imageUrl}?retry=${retryAttempt}` : data.imageUrl}
        onError={() => setMediaError(true)}
      />
    </div>
  );
}
