"use client";

import { useState } from "react";
import { TourListClient } from "./TourListClient";
import { TourEditorClient } from "./TourEditorClient";

export function TourBuilderShell() {
  const [activeTourId, setActiveTourId] = useState<string | null>(null);

  if (activeTourId) {
    return (
      <TourEditorClient
        tourId={activeTourId}
        onBack={() => setActiveTourId(null)}
      />
    );
  }

  return <TourListClient onSelectTour={setActiveTourId} />;
}
