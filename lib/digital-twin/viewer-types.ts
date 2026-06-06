import type { TwinViewerKind } from "./viewer-format";

export type TwinGpsMetadata = {
  lat: number;
  lng: number;
  alt?: number;
  accuracy?: number;
  capturedAt?: string;
};

export type TwinSpaceViewerData = {
  spaceId: string;
  spaceTitle: string;
  spaceStatus: string;
  modelId: string;
  modelTitle: string;
  modelFormat: string;
  modelUrl: string;
  viewerKind: TwinViewerKind;
  latestGps: TwinGpsMetadata | null;
};
