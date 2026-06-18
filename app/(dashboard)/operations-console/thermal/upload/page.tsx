import { ThermalUploadClient } from "@/components/ops/thermal/ThermalUploadClient";
import { ThermalPreflightChecklist } from "@/components/ops/thermal/ThermalPreflightChecklist";
import { ThermalSlateDropImport } from "@/components/ops/thermal/ThermalSlateDropImport";

export default function ThermalUploadPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <ThermalPreflightChecklist />
        <ThermalUploadClient />
      </div>
      <ThermalSlateDropImport />
    </div>
  );
}
