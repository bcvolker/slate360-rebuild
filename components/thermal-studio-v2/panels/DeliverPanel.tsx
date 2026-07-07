import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { PlaceholderZone } from "./PlaceholderZone";

/** Tab 5 — Deliver (doc §1). Real content lands in S8/S8.5. */
export function DeliverPanel() {
  return (
    <V2PanelFrame
      left={{
        title: "Sections",
        content: (
          <PlaceholderZone
            label="Section nav"
            detail="Share link · Report downloads · Data exports · Time-lapse & video · Site map · Q&A inbox (S8)"
          />
        ),
      }}
      center={
        <PlaceholderZone label="Active surface" detail="The selected section's content (S8/S8.5)" />
      }
    />
  );
}
