import type { ThermalReportTemplate } from "@/lib/thermal/report-templates";

export async function listReportTemplates(): Promise<ThermalReportTemplate[]> {
  try {
    const res = await fetch("/api/ops/thermal/report-templates");
    if (!res.ok) return [];
    const json = await res.json();
    return (json.templates ?? json.data?.templates ?? []) as ThermalReportTemplate[];
  } catch {
    return [];
  }
}
