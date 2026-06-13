import { ThermalUploadClient } from "@/components/ops/thermal/ThermalUploadClient";
import { ThermalPreflightChecklist } from "@/components/ops/thermal/ThermalPreflightChecklist";

export default function ThermalUploadPage() {
  return (
    <div className="space-y-4">
      <ThermalPreflightChecklist />
      <ThermalUploadClient />
      <div className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] p-4 text-sm">
        <p className="font-semibold text-[var(--graphite-text-header)]">Direct camera import</p>
        <p className="mt-1 text-[var(--graphite-muted)]">
          Save radiometric JPEG files from your camera app, then upload them above. USB and Bluetooth import will
          ship in a later release.
        </p>
      </div>
    </div>
  );
}
