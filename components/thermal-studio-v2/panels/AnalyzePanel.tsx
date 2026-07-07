import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { PlaceholderZone } from "./PlaceholderZone";

/** Tab 2 — Analyze (doc §1). Real content lands in S3-S5. */
export function AnalyzePanel() {
  return (
    <V2PanelFrame
      toolbar={
        <span className="text-[11px] text-[var(--graphite-muted)]">
          Point · Area · Line · Move/Select — palette · °C/°F · Undo ↶ Redo ↷ (S3-S4)
        </span>
      }
      left={{
        title: "Working set",
        content: (
          <PlaceholderZone label="Working-set list" detail="Filmstrip ↔ folder tree toggle, per-image badges (S3)" />
        ),
      }}
      center={
        <PlaceholderZone
          label="Viewer"
          detail="Zoom/pan, hover temp readout, draggable legend span, floating loupe, blend slider, synced compare (S3)"
        />
      }
      right={{
        title: "Measurements",
        content: (
          <PlaceholderZone
            label="Measurements · Tuning · Display · Notes"
            detail="Accordions, Measurements open first (S4-S5)"
          />
        ),
      }}
      bottom={{
        title: "Filmstrip",
        content: <PlaceholderZone label="Filmstrip carousel" detail="Click = open, ✓ corner = select (S3)" />,
      }}
    />
  );
}
