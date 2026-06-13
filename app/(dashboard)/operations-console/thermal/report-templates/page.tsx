import Link from "next/link";
import { ThermalReportTemplateManager } from "@/components/ops/thermal/ThermalReportTemplateManager";

export const metadata = {
  title: "Report Templates — Thermal — Slate360",
};

export default function ThermalReportTemplatesPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/operations-console/thermal"
        className="text-sm text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
      >
        ← All sessions
      </Link>
      <ThermalReportTemplateManager />
    </div>
  );
}
