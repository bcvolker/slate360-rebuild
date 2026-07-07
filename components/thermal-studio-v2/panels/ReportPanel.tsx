import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { PlaceholderZone } from "./PlaceholderZone";

/** Tab 4 — Report (doc §1). Real content lands in S7. */
export function ReportPanel() {
  return (
    <V2PanelFrame
      left={{
        title: "Outline",
        content: (
          <PlaceholderZone
            label="Report outline"
            detail="Ordered image list, drag to reorder, section toggles (S7)"
          />
        ),
      }}
      center={
        <PlaceholderZone
          label="WYSIWYG preview"
          detail="Paginated paper sheets matching the PDF, 2 images per page default (S7)"
        />
      }
      right={{
        title: "Template & branding",
        content: (
          <PlaceholderZone
            label="Template gallery · branding · Generate PDF"
            detail="Visual thumbnails, logo/company/footer, site conditions, signature (S7)"
          />
        ),
      }}
    />
  );
}
