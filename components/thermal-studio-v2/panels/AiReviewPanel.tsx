import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { PlaceholderZone } from "./PlaceholderZone";

/** Tab 3 — AI Review (doc §1). Real content lands in S6. */
export function AiReviewPanel() {
  return (
    <V2PanelFrame
      left={{
        title: "Images with detections",
        content: <PlaceholderZone label="Detections list" detail="Severity-sorted, filter by type/severity (S6)" />,
      }}
      center={
        <PlaceholderZone
          label="Viewer with outline boxes"
          detail="Numbered boxes matching the right-hand list; click either to highlight both (S6)"
        />
      }
      right={{
        title: "Findings",
        content: (
          <PlaceholderZone
            label="Finding cards"
            detail="Type in words, severity chip, AI-drafted note, Accept ✓ / Edit ✎ / Dismiss ✕ (S6)"
          />
        ),
      }}
      bottom={{
        title: "Filmstrip",
        content: <PlaceholderZone label="Filmstrip" detail="Detection-count badges (S6)" />,
      }}
    />
  );
}
