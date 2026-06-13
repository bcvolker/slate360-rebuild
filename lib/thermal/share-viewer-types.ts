import "server-only";

import type { ThermalBrandingConfig } from "@/lib/thermal/types";

export type ThermalShareViewerData = {
  sessionId: string;
  sessionName: string;
  role: string;
  linkedSpaceId?: string | null;
  branding: ThermalBrandingConfig;
  summaryMetrics: Record<string, unknown>;
  captures: Array<{
    id: string;
    filename: string | null;
    previewUrl: string | null;
    qualityMetrics: Record<string, unknown>;
    anomalies: unknown[];
    gpsPosition?: Record<string, unknown>;
  }>;
};
