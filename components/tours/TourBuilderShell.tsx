"use client";

import { useState } from "react";
import { TourListClient } from "./TourListClient";
import { TourStudioShell } from "./TourStudioShell";

export function TourBuilderShell() {
  const [activeTourId, setActiveTourId] = useState<string | null>(null);

  if (activeTourId) {
    return <TourStudioShell tourId={activeTourId} onBack={() => setActiveTourId(null)} />;
  }

  return <TourListClient onSelectTour={setActiveTourId} />;
}
