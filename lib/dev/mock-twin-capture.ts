/** Mock Twin 360 capture data — dev sandbox only, no backend calls. */

export type TwinCaptureDataKind = "photo" | "video" | "lidar" | "gps" | "360";

export type TwinOutputType = "gaussian_splat" | "photogrammetry" | "point_cloud" | "nerf";
export type TwinQualityTier = "draft" | "standard" | "high";
export type TwinSpeedTier = "standard" | "priority";

export type MockTwinSpace = {
  id: string;
  name: string;
  projectName: string;
  lastCapturedAt: string | null;
  assetCount: number;
};

export type MockTwinCaptureAsset = {
  id: string;
  name: string;
  kind: TwinCaptureDataKind;
  sizeBytes: number;
  count: number;
};

export type TwinSubmissionChoices = {
  outputType: TwinOutputType;
  quality: TwinQualityTier;
  speed: TwinSpeedTier;
};

export type TwinCostBreakdownLine = {
  label: string;
  credits: number;
  minutes: number;
};

export type TwinSubmissionEstimate = {
  credits: number;
  minutes: number;
  breakdown: TwinCostBreakdownLine[];
};

export const MOCK_TWIN_CREDIT_BALANCE = 248;

export const MOCK_TWIN_SPACES: MockTwinSpace[] = [
  {
    id: "space-lobby",
    name: "Lobby — Level 1",
    projectName: "Riverside Tower",
    lastCapturedAt: "2026-06-02T14:22:00Z",
    assetCount: 42,
  },
  {
    id: "space-mezz",
    name: "Mezzanine overlook",
    projectName: "Riverside Tower",
    lastCapturedAt: "2026-05-28T09:10:00Z",
    assetCount: 18,
  },
  {
    id: "space-parking",
    name: "Parking structure — P2",
    projectName: "Harbor Logistics",
    lastCapturedAt: null,
    assetCount: 0,
  },
];

export const MOCK_TWIN_CAPTURE_ASSETS: MockTwinCaptureAsset[] = [
  { id: "a-photos", name: "Photo burst frames", kind: "photo", sizeBytes: 186_400_000, count: 312 },
  { id: "a-video", name: "Walk-through video", kind: "video", sizeBytes: 524_800_000, count: 1 },
  { id: "a-lidar", name: "LiDAR depth sweep", kind: "lidar", sizeBytes: 94_200_000, count: 4 },
  { id: "a-gps", name: "GPS track points", kind: "gps", sizeBytes: 48_000, count: 1 },
  { id: "a-360", name: "360° panorama set", kind: "360", sizeBytes: 128_600_000, count: 6 },
];

const OUTPUT_MULTIPLIER: Record<TwinOutputType, number> = {
  gaussian_splat: 1,
  photogrammetry: 1.22,
  point_cloud: 0.82,
  nerf: 1.48,
};

const QUALITY_MULTIPLIER: Record<TwinQualityTier, number> = {
  draft: 0.58,
  standard: 1,
  high: 1.82,
};

const SPEED_CREDIT_MULTIPLIER: Record<TwinSpeedTier, number> = {
  standard: 1,
  priority: 1.34,
};

const SPEED_TIME_MULTIPLIER: Record<TwinSpeedTier, number> = {
  standard: 1,
  priority: 0.68,
};

const DATA_KIND_SURCHARGE: Record<TwinCaptureDataKind, { credit: number; time: number }> = {
  photo: { credit: 0, time: 0 },
  video: { credit: 0.18, time: 0.22 },
  lidar: { credit: 0.12, time: 0.1 },
  gps: { credit: 0.04, time: 0.02 },
  "360": { credit: 0.16, time: 0.14 },
};

export function formatTwinBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function formatTwinDuration(minutes: number): string {
  if (minutes < 60) return `~${Math.max(1, Math.round(minutes))} min`;
  const hours = Math.floor(minutes / 60);
  const rem = Math.round(minutes % 60);
  return rem > 0 ? `~${hours}h ${rem}m` : `~${hours}h`;
}

function baseCreditsFromAssets(assets: MockTwinCaptureAsset[]): number {
  const totalBytes = assets.reduce((sum, row) => sum + row.sizeBytes, 0);
  const totalCount = assets.reduce((sum, row) => sum + row.count, 0);
  const gb = totalBytes / 1_073_741_824;
  return Math.round(18 + gb * 42 + totalCount * 0.06);
}

function baseMinutesFromAssets(assets: MockTwinCaptureAsset[]): number {
  const totalBytes = assets.reduce((sum, row) => sum + row.sizeBytes, 0);
  const gb = totalBytes / 1_073_741_824;
  return 12 + gb * 28;
}

export function estimateTwinSubmission(
  assets: MockTwinCaptureAsset[],
  choices: TwinSubmissionChoices,
): TwinSubmissionEstimate {
  const baseCredits = baseCreditsFromAssets(assets);
  const baseMinutes = baseMinutesFromAssets(assets);

  const outputMul = OUTPUT_MULTIPLIER[choices.outputType];
  const qualityMul = QUALITY_MULTIPLIER[choices.quality];
  const speedCreditMul = SPEED_CREDIT_MULTIPLIER[choices.speed];
  const speedTimeMul = SPEED_TIME_MULTIPLIER[choices.speed];

  let dataCreditMul = 1;
  let dataTimeMul = 1;
  for (const asset of assets) {
    const surcharge = DATA_KIND_SURCHARGE[asset.kind];
    dataCreditMul += surcharge.credit;
    dataTimeMul += surcharge.time;
  }

  const credits = Math.max(
    1,
    Math.round(baseCredits * outputMul * qualityMul * speedCreditMul * dataCreditMul),
  );
  const minutes = Math.max(
    1,
    Math.round(baseMinutes * outputMul * qualityMul * speedTimeMul * dataTimeMul),
  );

  const breakdown: TwinCostBreakdownLine[] = [
    {
      label: "Base data volume",
      credits: Math.round(baseCredits * 0.55),
      minutes: Math.round(baseMinutes * 0.5),
    },
    {
      label: `${labelOutputType(choices.outputType)} · ${choices.quality}`,
      credits: Math.round(baseCredits * outputMul * qualityMul * 0.28),
      minutes: Math.round(baseMinutes * outputMul * qualityMul * 0.32),
    },
    {
      label: choices.speed === "priority" ? "Priority queue" : "Standard queue",
      credits: Math.round(credits * (choices.speed === "priority" ? 0.12 : 0.06)),
      minutes: Math.round(minutes * (choices.speed === "priority" ? -0.18 : 0)),
    },
    {
      label: "Sensor mix surcharge",
      credits: Math.max(0, credits - Math.round(baseCredits * outputMul * qualityMul * speedCreditMul)),
      minutes: Math.max(0, minutes - Math.round(baseMinutes * outputMul * qualityMul * speedTimeMul)),
    },
  ];

  return { credits, minutes, breakdown };
}

export function labelOutputType(type: TwinOutputType): string {
  switch (type) {
    case "gaussian_splat":
      return "Gaussian Splat";
    case "photogrammetry":
      return "Photogrammetry Mesh";
    case "point_cloud":
      return "Point Cloud";
    case "nerf":
      return "NeRF";
  }
}

export const TWIN_OUTPUT_OPTIONS: { id: TwinOutputType; label: string; hint?: string }[] = [
  { id: "gaussian_splat", label: "Gaussian Splat", hint: "Default · fast preview" },
  { id: "photogrammetry", label: "Photogrammetry Mesh" },
  { id: "point_cloud", label: "Point Cloud" },
  { id: "nerf", label: "NeRF", hint: "Beta" },
];

export const TWIN_QUALITY_OPTIONS: { id: TwinQualityTier; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "standard", label: "Standard" },
  { id: "high", label: "High" },
];

export const TWIN_SPEED_OPTIONS: { id: TwinSpeedTier; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "priority", label: "Priority" },
];
