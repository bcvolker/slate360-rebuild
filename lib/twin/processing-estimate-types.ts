export type TwinJobCreditEstimate = {
  creditsRequired: number;
  creditsBalance: number;
  sufficient: boolean;
  assetCount: number;
  estimatedMinutes?: number;
  frameCount?: number;
};

export type TwinProcessingQuality = "standard" | "high";
