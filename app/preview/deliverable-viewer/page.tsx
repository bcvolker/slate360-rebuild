// Preview harness for the public deliverable viewer (/view/[token]) with mock items (no login, no view counting).
"use client";

import ViewerClient from "@/app/view/[token]/ViewerClient";
import type { ViewerDeliverable } from "@/lib/site-walk/viewer-types";

const DELIVERABLE: ViewerDeliverable = {
  id: "preview-deliverable",
  title: "Level 2 framing walk",
  senderName: "Payne Construction",
  shareToken: "preview-token-0000",
  metadataVisibility: { timestamp: true, author: true, weather: true },
  items: [
    {
      id: "i1",
      type: "photo",
      title: "North wall header",
      url: "https://picsum.photos/seed/slate-l5-1/1600/1000",
      notes: "Header at grid C-4 is doubled as drawn. Blocking above the window still to go in.",
      metadata: { timestamp: "2026-09-24T15:12:00Z", author: "Brian V.", weather: "Clear, 78°F" },
    },
    {
      id: "i2",
      type: "photo",
      title: "Stair opening",
      url: "https://picsum.photos/seed/slate-l5-2/1600/1000",
      notes: "Guardrail posts set; top rail pending.",
      metadata: { timestamp: "2026-09-24T15:20:00Z", author: "Brian V." },
    },
    { id: "i3", type: "note", title: "Inspection reminder", notes: "Framing inspection booked for Oct 2." },
  ],
};

export default function DeliverableViewerPreview() {
  return <ViewerClient deliverable={DELIVERABLE} token={DELIVERABLE.shareToken} />;
}
