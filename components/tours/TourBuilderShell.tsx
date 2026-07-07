"use client";

import { useState } from "react";
import { TourListClient } from "./TourListClient";
import { TourStudioShell } from "./TourStudioShell";

export function TourBuilderShell() {
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<FileList | undefined>(undefined);

  if (activeTourId) {
    return (
      <TourStudioShell
        tourId={activeTourId}
        pendingFiles={pendingFiles}
        onBack={() => {
          setActiveTourId(null);
          setPendingFiles(undefined);
        }}
      />
    );
  }

  return (
    <TourListClient
      onSelectTour={(tourId, files) => {
        setActiveTourId(tourId);
        setPendingFiles(files);
      }}
    />
  );
}
