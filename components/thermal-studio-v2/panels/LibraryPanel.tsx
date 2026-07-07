import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { PlaceholderZone } from "./PlaceholderZone";

/** Tab 1 — Library (doc §1). Real content lands in S2. */
export function LibraryPanel() {
  return (
    <V2PanelFrame
      left={{
        title: "Folders & filters",
        content: (
          <PlaceholderZone
            label="SlateDrop folder tree + filters"
            detail="Project → folder tree, drag-drop upload, Flagged / In report / High ΔT / camera filters (S2)"
          />
        ),
      }}
      center={
        <PlaceholderZone
          label="Thumbnail grid"
          detail="Virtualized grid, marquee + shift-click + Select all, badges (S2)"
        />
      }
      right={{
        title: "Next steps",
        content: (
          <PlaceholderZone
            label="Next steps"
            detail="Decode temperatures (N) → Find problems with AI (N) → Add N to report (S2)"
          />
        ),
      }}
    />
  );
}
