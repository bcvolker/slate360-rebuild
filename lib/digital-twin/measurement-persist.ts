import {
  computeMeasurementValue,
  type DisplayUnit,
  type MeasurementKind,
} from "./measurement-math";
import { isFiniteVec3, type Vec3 } from "./s360-world";

export type MeasurementScope = "project" | "epoch";

export type TwinMeasurementRecord = {
  id: string;
  kind: MeasurementKind;
  points: Vec3[];
  value: number;
  unit: DisplayUnit;
  label: string;
  hidden: boolean;
  scope: MeasurementScope;
  epochId: string | null;
  spaceId: string | null;
  modelId: string | null;
  sourceMetricAssetId: string | null;
  source: "metric-mesh";
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

export type MeasurementMetadataV1 = {
  v: 1;
  kind: MeasurementKind;
  points: Vec3[];
  hidden?: boolean;
  scope?: MeasurementScope;
  epoch_id?: string | null;
  source?: "metric-mesh";
  source_metric_asset_id?: string | null;
};

const KINDS: MeasurementKind[] = [
  "distance",
  "polyline",
  "height",
  "horizontal",
  "area",
  "perimeter",
  "angle",
  "clearance",
];

function isKind(value: unknown): value is MeasurementKind {
  return typeof value === "string" && (KINDS as string[]).includes(value);
}

function isUnit(value: unknown): value is DisplayUnit {
  return value === "m" || value === "mm" || value === "ft" || value === "in";
}

function parsePoints(raw: unknown): Vec3[] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const points: Vec3[] = [];
  for (const item of raw) {
    if (!isFiniteVec3(item)) return null;
    points.push({ x: item.x, y: item.y, z: item.z });
  }
  return points;
}

export function serializeMeasurementMetadata(record: TwinMeasurementRecord): MeasurementMetadataV1 {
  return {
    v: 1,
    kind: record.kind,
    points: record.points,
    hidden: record.hidden,
    scope: record.scope,
    epoch_id: record.epochId,
    source: "metric-mesh",
    source_metric_asset_id: record.sourceMetricAssetId,
  };
}

export function deserializeMeasurement(row: {
  id: string;
  label?: string | null;
  start_point: unknown;
  end_point: unknown;
  measured_value?: number | null;
  unit?: string | null;
  metadata?: unknown;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  space_id?: string | null;
  model_id?: string | null;
}): TwinMeasurementRecord | null {
  const meta =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};
  const fromMeta = parsePoints(meta.points);
  const start = isFiniteVec3(row.start_point) ? row.start_point : null;
  const end = isFiniteVec3(row.end_point) ? row.end_point : null;
  const points = fromMeta ?? (start && end ? [start, end] : null);
  if (!points) return null;

  const kind: MeasurementKind = isKind(meta.kind) ? meta.kind : "distance";
  const computed = computeMeasurementValue(kind, points);
  const value =
    typeof row.measured_value === "number" && Number.isFinite(row.measured_value)
      ? row.measured_value
      : (computed ?? 0);
  const now = new Date().toISOString();

  return {
    id: row.id,
    kind,
    points,
    value,
    unit: isUnit(row.unit) ? row.unit : "m",
    label: typeof row.label === "string" && row.label.trim() ? row.label : kind,
    hidden: meta.hidden === true,
    scope: meta.scope === "epoch" ? "epoch" : "project",
    epochId: typeof meta.epoch_id === "string" ? meta.epoch_id : row.model_id ?? null,
    spaceId: row.space_id ?? null,
    modelId: row.model_id ?? null,
    sourceMetricAssetId:
      typeof meta.source_metric_asset_id === "string" ? meta.source_metric_asset_id : null,
    source: "metric-mesh",
    createdAt: row.created_at ?? now,
    updatedAt: row.updated_at ?? row.created_at ?? now,
    createdBy: row.created_by ?? null,
  };
}

export function toApiInsertBody(record: Omit<TwinMeasurementRecord, "id" | "createdAt" | "updatedAt">) {
  const first = record.points[0];
  const last = record.points[record.points.length - 1] ?? first;
  return {
    space_id: record.spaceId,
    model_id: record.scope === "epoch" ? record.modelId : record.modelId,
    start_point: first,
    end_point: last,
    measured_value: record.value,
    unit: record.unit,
    label: record.label,
    metadata: serializeMeasurementMetadata({
      ...record,
      id: "pending",
      createdAt: "",
      updatedAt: "",
    }),
  };
}

const STORAGE_PREFIX = "s360.hybrid-twin.measurements.";

export function localStorageKey(spaceKey: string): string {
  return `${STORAGE_PREFIX}${spaceKey}`;
}

export function loadLocalMeasurements(spaceKey: string): TwinMeasurementRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(localStorageKey(spaceKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => deserializeMeasurement(row as Parameters<typeof deserializeMeasurement>[0]))
      .filter((m): m is TwinMeasurementRecord => m !== null);
  } catch {
    return [];
  }
}

export function saveLocalMeasurements(spaceKey: string, rows: TwinMeasurementRecord[]): void {
  if (typeof window === "undefined") return;
  const payload = rows.map((row) => ({
    id: row.id,
    label: row.label,
    start_point: row.points[0],
    end_point: row.points[row.points.length - 1],
    measured_value: row.value,
    unit: row.unit,
    metadata: serializeMeasurementMetadata(row),
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    created_by: row.createdBy,
    space_id: row.spaceId,
    model_id: row.modelId,
  }));
  window.localStorage.setItem(localStorageKey(spaceKey), JSON.stringify(payload));
}

export function newMeasurementId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
