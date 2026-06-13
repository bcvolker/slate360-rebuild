export type ThermalSessionStatus =
  | "draft"
  | "uploading"
  | "processing"
  | "complete"
  | "failed";

export type ThermalJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "canceled";

export type ThermalJobType =
  | "extract"
  | "align"
  | "analyze"
  | "stitch"
  | "report"
  | "full_pipeline";

export type ThermalBrandingConfig = {
  company_name: string;
  logo_url: string;
  primary_color: string;
  show_metrics: boolean;
  custom_footer: string;
};

export type ThermalQualityMetrics = {
  confidence_score?: number;
  is_radiometric?: boolean;
  has_parallax_risk?: boolean;
  blur_score?: number;
  saturation_pct?: number;
  gps_present?: boolean;
  min_temp_c?: number;
  max_temp_c?: number;
  avg_temp_c?: number;
  sensor_make?: string;
  sensor_model?: string;
  parser_id?: string;
  absolute_celsius?: boolean;
  error?: string;
};

export type ThermalAnalysisSession = {
  id: string;
  org_id: string | null;
  project_id: string | null;
  created_by: string | null;
  name: string;
  description: string | null;
  status: ThermalSessionStatus;
  metadata: Record<string, unknown>;
  branding_config: ThermalBrandingConfig;
  summary_metrics: Record<string, unknown>;
  telemetry: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ThermalCapture = {
  id: string;
  session_id: string;
  org_id: string | null;
  storage_path: string;
  npz_data_path: string | null;
  preview_path: string | null;
  filename: string | null;
  content_type: string | null;
  file_size_bytes: number;
  sensor_profile: Record<string, unknown>;
  gps_position: Record<string, unknown>;
  quality_metrics: ThermalQualityMetrics;
  anomalies: unknown[];
  telemetry: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ThermalProcessingJob = {
  id: string;
  session_id: string;
  org_id: string | null;
  created_by: string | null;
  job_type: ThermalJobType;
  status: ThermalJobStatus;
  progress_pct: number;
  stage: string | null;
  worker_id: string | null;
  worker_run_id: string | null;
  error_log: string | null;
  input_capture_ids: string[];
  output_storage_keys: Record<string, unknown>;
  quality_metrics: Record<string, unknown>;
  telemetry: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ThermalWorkerCaptureResult = {
  captureId: string;
  npzDataPath?: string;
  previewPath?: string;
  qualityMetrics?: ThermalQualityMetrics;
  sensorProfile?: Record<string, unknown>;
  error?: string;
};

export type ThermalWorkerAnalyzeResult = {
  captureId: string;
  anomalies?: unknown[];
  qualityMetrics?: Record<string, unknown>;
  error?: string;
};

export type ThermalWorkerAlignResult = {
  captureId: string;
  alignManifest?: string;
  qualityMetrics?: { alignment_quality?: string };
  error?: string;
};

export type ThermalWorkerReportOutput = {
  title: string;
  pdfKey: string;
  htmlKey?: string;
  templateId?: string;
};

export type ThermalWorkerCallbackPayload = {
  jobId: string;
  status: "completed" | "failed" | "progress";
  progressPct?: number;
  stage?: string;
  captureResults?: ThermalWorkerCaptureResult[];
  analyzeResults?: ThermalWorkerAnalyzeResult[];
  alignResults?: ThermalWorkerAlignResult[];
  reportOutput?: ThermalWorkerReportOutput;
  qualityMetrics?: Record<string, unknown>;
  errorLog?: string;
};
