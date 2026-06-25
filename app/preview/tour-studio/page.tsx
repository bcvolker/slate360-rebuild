"use client";

import { useState } from "react";
import {
  TourStudioWorkspace, type TourTab, type TourSceneRow,
} from "@/components/tours/TourStudioWorkspace";

// Unauthenticated harness for the CEO-gated 360° Tour Builder. Renders the real
// workspace with mock data + a real equirectangular sample so we can verify layout,
// no-scroll, tabs, and scene status states without logging in.
const SAMPLE = "https://photo-sphere-viewer-data.netlify.app/assets/sphere.jpg";

const SCENES: TourSceneRow[] = [
  { id: "a", title: "Lobby", sort_order: 0, status: "ready", initial_yaw: 20, initial_pitch: -5, default_zoom: 50 },
  { id: "b", title: "Roof (aerial)", sort_order: 1, status: "ready", initial_yaw: 0, initial_pitch: 0 },
  { id: "c", title: "Mechanical Room", sort_order: 2, status: "processing" },
  { id: "d", title: "Drone pass 4", sort_order: 3, status: "failed", processing_error: "Not 2:1 equirectangular" },
];

export default function TourStudioPreview() {
  const [tab, setTab] = useState<TourTab>("library");
  const [activeSceneId, setActiveSceneId] = useState<string | null>("a");

  return (
    <div className="dark h-[100dvh] w-full bg-[var(--graphite-canvas)] p-3">
      <TourStudioWorkspace
        title="Riverside Tower — Preview"
        tourStatus="draft"
        viewerSlug={null}
        scenes={SCENES}
        connected
        activeTab={tab}
        onTab={setTab}
        activeSceneId={activeSceneId}
        onSelectScene={setActiveSceneId}
        resolveImageUrl={async (_id, _variant) => SAMPLE}
        onUpload={() => {}}
        onDeleteScene={() => {}}
        onReorder={() => {}}
        onSetStartView={(id, v) => console.log("set start view", id, v)}
        onRestrictView={(id, v) => console.log("restrict view", id, v)}
        onPublish={() => {}}
        onBack={() => {}}
      />
    </div>
  );
}
