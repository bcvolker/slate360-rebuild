import { ThermalUploadClient } from "@/components/ops/thermal/ThermalUploadClient";
import { ThermalPreflightChecklist } from "@/components/ops/thermal/ThermalPreflightChecklist";

export default function ThermalUploadPage() {
  return (
    <div className="space-y-4">
      <ThermalPreflightChecklist />
      <ThermalUploadClient />
    </div>
  );
}
