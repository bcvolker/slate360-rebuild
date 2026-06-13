import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

const ITEMS = [
  "Radiometric R-JPEG only (640T, M3T, FLIR, or registered fallback profile)",
  "GPS enabled when possible for GeoJSON exports and twin alignment",
  "Overlap 60–80% for roof envelopes; avoid motion blur and saturation",
  "Emissivity set on camera before capture when the sensor supports it",
  "Batch size under 200 images per session for predictable Modal CPU cost",
];

export function ThermalPreflightChecklist() {
  return (
    <div className={t.card}>
      <p className={t.eyebrow}>Pre-flight checklist</p>
      <ul className="mt-3 space-y-2">
        {ITEMS.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-[var(--graphite-text-body)]">
            <span className="text-[var(--graphite-primary)]">»</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
